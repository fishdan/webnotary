import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  certInventoryKeys,
  hostCertKeys,
  normalizeHostname,
  PENDING_CREATE_CONDITION,
  pendingExpiresAt,
  pendingVerifyKeys,
  type DomainCertStatus,
} from "@webnotary/data-model";
import type { SiblingCert } from "@webnotary/trust-policy";

export interface DomainCertLookupResult {
  found: boolean;
  status?: DomainCertStatus;
}

export interface DomainCertStore {
  getStatus(hostname: string, certificateSha256: string): Promise<DomainCertLookupResult>;
  listSiblings(hostname: string): Promise<SiblingCert[]>;
}

export interface InventoryStore {
  hasCertificate(certificateSha256: string): Promise<boolean>;
}

export interface ClientSightingRecorder {
  record(hostname: string, certificateSha256: string): Promise<void>;
}

export interface CtSeenStamper {
  /** Best-effort: set CT_SEEN when missing/UNKNOWN; never downgrade trust/conflict. */
  stamp(hostname: string, certificateSha256: string): Promise<void>;
}

export interface ObservedCertUpserter {
  /** Independent observation trust write — never call from client-only paths. */
  upsert(input: {
    hostname: string;
    certificateSha256: string;
    spkiSha256: string;
    notBefore: string;
    notAfter: string;
    issuer: string;
    observedAt: string;
    evidenceKey?: string;
  }): Promise<void>;
}

export interface VerificationScheduler {
  /** @returns true if this caller created pending and enqueued */
  tryEnqueue(hostname: string, requestedCertificateSha256: string): Promise<boolean>;
}

function docClient(
  client?: DynamoDBDocumentClient,
): DynamoDBDocumentClient {
  return client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

export function createDynamoDomainCertStore(
  tableName: string,
  client?: DynamoDBDocumentClient,
): DomainCertStore {
  const dynamo = docClient(client);
  return {
    async getStatus(hostname, certificateSha256) {
      const keys = hostCertKeys(hostname, certificateSha256);
      const result = await dynamo.send(
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

    async listSiblings(hostname) {
      const h = normalizeHostname(hostname);
      const result = await dynamo.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: {
            ":pk": `HOST#${h}`,
          },
          ProjectionExpression: "certificateSha256, #s",
          ExpressionAttributeNames: { "#s": "status" },
        }),
      );

      const siblings: SiblingCert[] = [];
      for (const item of result.Items ?? []) {
        const fp = item.certificateSha256;
        const status = item.status;
        if (typeof fp === "string" && typeof status === "string") {
          siblings.push({
            certificateSha256: fp,
            status: status as DomainCertStatus,
          });
        }
      }
      return siblings;
    },
  };
}

export function createDynamoInventoryStore(
  tableName: string,
  client?: DynamoDBDocumentClient,
): InventoryStore {
  const dynamo = docClient(client);
  return {
    async hasCertificate(certificateSha256) {
      const keys = certInventoryKeys(certificateSha256);
      const result = await dynamo.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: keys.pk, sk: keys.sk },
          ProjectionExpression: "pk",
        }),
      );
      return Boolean(result.Item);
    },
  };
}

export function createDynamoClientSightingRecorder(
  tableName: string,
  client?: DynamoDBDocumentClient,
): ClientSightingRecorder {
  const dynamo = docClient(client);
  return {
    async record(hostname, certificateSha256) {
      const keys = hostCertKeys(hostname, certificateSha256);
      const now = new Date().toISOString();
      await dynamo.send(
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

export function createDynamoCtSeenStamper(
  tableName: string,
  client?: DynamoDBDocumentClient,
): CtSeenStamper {
  const dynamo = docClient(client);
  return {
    async stamp(hostname, certificateSha256) {
      const keys = hostCertKeys(hostname, certificateSha256);
      const now = new Date().toISOString();
      try {
        await dynamo.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: keys.pk, sk: keys.sk },
            UpdateExpression: `
              SET hostname = :hostname,
                  certificateSha256 = :fp,
                  entityType = if_not_exists(entityType, :entityType),
                  #status = :ctSeen,
                  ctSeen = :true,
                  updatedAt = :now
            `,
            ConditionExpression:
              "attribute_not_exists(#status) OR #status = :unknown OR #status = :ctSeen",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":hostname": hostname,
              ":fp": certificateSha256,
              ":entityType": "DOMAIN_CERT",
              ":ctSeen": "CT_SEEN",
              ":unknown": "UNKNOWN",
              ":true": true,
              ":now": now,
            },
          }),
        );
      } catch (err) {
        const name = (err as { name?: string }).name;
        if (name === "ConditionalCheckFailedException") {
          return;
        }
        throw err;
      }
    },
  };
}

export function createDynamoObservedCertUpserter(
  tableName: string,
  client?: DynamoDBDocumentClient,
): ObservedCertUpserter {
  const dynamo = docClient(client);
  return {
    async upsert(input) {
      const keys = hostCertKeys(input.hostname, input.certificateSha256);
      await dynamo.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: keys.pk, sk: keys.sk },
          UpdateExpression: `
            SET entityType = :entityType,
                hostname = :hostname,
                certificateSha256 = :fp,
                spkiSha256 = :spki,
                #status = :status,
                notBefore = :notBefore,
                notAfter = :notAfter,
                issuer = :issuer,
                firstObserved = if_not_exists(firstObserved, :observedAt),
                lastObserved = :observedAt,
                lastEvidenceS3Key = if_not_exists(lastEvidenceS3Key, :evidenceKey),
                updatedAt = :observedAt
            ADD observationCount :one, observerCount :one
          `,
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":entityType": "DOMAIN_CERT",
            ":hostname": input.hostname,
            ":fp": input.certificateSha256,
            ":spki": input.spkiSha256,
            ":status": "SINGLE_OBSERVED",
            ":notBefore": input.notBefore,
            ":notAfter": input.notAfter,
            ":issuer": input.issuer,
            ":observedAt": input.observedAt,
            ":evidenceKey": input.evidenceKey ?? "acquire/inline",
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
  const dynamo = docClient(params.dynamo);
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
