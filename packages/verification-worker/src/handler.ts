import type { SQSEvent, SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { observe } from "@webnotary/observer";
import { hostCertKeys, pendingVerifyKeys } from "@webnotary/data-model";
import { persistObservation } from "./persist.js";

export interface VerifyMessage {
  hostname: string;
  requestedCertificateSha256?: string;
  requestedAt?: string;
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export async function processVerifyMessage(
  message: VerifyMessage,
  deps?: {
    observeFn?: typeof observe;
    persist?: typeof persistObservation;
    tableName?: string;
    bucketName?: string;
  },
): Promise<void> {
  const tableName = deps?.tableName ?? env("TABLE_NAME");
  const bucketName = deps?.bucketName ?? env("EVIDENCE_BUCKET");
  const observeFn = deps?.observeFn ?? observe;

  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const s3 = new S3Client({});

  const obs = await observeFn(message.hostname, {
    observerId: process.env.OBSERVER_ID ?? "aws-lambda-observer",
  });

  await (deps?.persist ?? persistObservation)(
    {
      tableName,
      bucketName,
      async putObject(key, body) {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: body,
            ContentType: "application/json",
          }),
        );
      },
      async upsertObservedCert(input) {
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
                  lastEvidenceS3Key = :evidenceKey,
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
              ":evidenceKey": input.evidenceKey,
              ":one": 1,
            },
          }),
        );
      },
      async deletePending(hostname) {
        const keys = pendingVerifyKeys(hostname);
        await dynamo.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { pk: keys.pk, sk: keys.sk },
          }),
        );
      },
    },
    obs,
    message.requestedCertificateSha256,
  );
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as VerifyMessage;
    if (!body.hostname) {
      throw new Error("SQS message missing hostname");
    }
    await processVerifyMessage(body);
  }
};
