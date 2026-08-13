import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  hostCertKeys,
  PENDING_CREATE_CONDITION,
  pendingExpiresAt,
  pendingVerifyKeys,
  type DomainCertStatus,
} from "@webnotary/data-model";

export interface DomainCertLookupResult {
  found: boolean;
  status?: DomainCertStatus;
}

export interface DomainCertStore {
  getStatus(hostname: string, certificateSha256: string): Promise<DomainCertLookupResult>;
}

export interface ClientSightingRecorder {
  record(hostname: string, certificateSha256: string): Promise<void>;
}

export interface VerificationScheduler {
  /** @returns true if this caller created pending and enqueued */
  tryEnqueue(hostname: string, requestedCertificateSha256: string): Promise<boolean>;
}

export function createDynamoDomainCertStore(
  tableName: string,
  client: DynamoDBDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({})),
): DomainCertStore {
  return {
    async getStatus(hostname, certificateSha256) {
      const keys = hostCertKeys(hostname, certificateSha256);
      const result = await client.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: keys.pk, sk: keys.sk },
          ProjectionExpression: "#s",
          ExpressionAttributeNames: { "#s": "status" },
        }),
      );

      if (!result.Item) {
        return { found: false };
      }

      return {
        found: true,
        status: result.Item.status as DomainCertStatus | undefined,
      };
    },
  };
}

export function createDynamoClientSightingRecorder(
  tableName: string,
  client: DynamoDBDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({})),
): ClientSightingRecorder {
  return {
    async record(hostname, certificateSha256) {
      const keys = hostCertKeys(hostname, certificateSha256);
      const now = new Date().toISOString();
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: keys.pk, sk: keys.sk },
          UpdateExpression: `
            SET lastClientSeen = :now,
                firstClientSeen = if_not_exists(firstClientSeen, :now),
                hostname = :hostname,
                certificateSha256 = :fp,
                entityType = if_not_exists(entityType, :entityType),
                #status = if_not_exists(#status, :unknown),
                updatedAt = :now
            ADD clientSeenCount :one
          `,
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":now": now,
            ":hostname": hostname,
            ":fp": certificateSha256,
            ":entityType": "DOMAIN_CERT",
            ":unknown": "UNKNOWN",
            ":one": 1,
          },
        }),
      );
    },
  };
}

export function createSqsVerificationScheduler(params: {
  tableName: string;
  queueUrl: string;
  dynamo?: DynamoDBDocumentClient;
  sqs?: SQSClient;
}): VerificationScheduler {
  const dynamo =
    params.dynamo ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const sqs = params.sqs ?? new SQSClient({});

  return {
    async tryEnqueue(hostname, requestedCertificateSha256) {
      const keys = pendingVerifyKeys(hostname);
      const now = new Date().toISOString();
      const expiresAt = pendingExpiresAt();

      try {
        await dynamo.send(
          new PutCommand({
            TableName: params.tableName,
            Item: {
              pk: keys.pk,
              sk: keys.sk,
              entityType: "PENDING_VERIFY",
              hostname,
              status: "PENDING",
              requestedAt: now,
              requestedCertificateSha256,
              expiresAt,
              updatedAt: now,
            },
            ConditionExpression: PENDING_CREATE_CONDITION,
          }),
        );
      } catch (err) {
        const name = (err as { name?: string }).name;
        if (name === "ConditionalCheckFailedException") {
          return false;
        }
        throw err;
      }

      try {
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: params.queueUrl,
            MessageBody: JSON.stringify({
              hostname,
              requestedCertificateSha256,
              requestedAt: now,
            }),
          }),
        );
      } catch (err) {
        // Allow a later request to retry enqueue after deleting the orphan pending lock.
        await dynamo
          .send(
            new DeleteCommand({
              TableName: params.tableName,
              Key: { pk: keys.pk, sk: keys.sk },
            }),
          )
          .catch(() => undefined);
        throw err;
      }

      return true;
    },
  };
}
