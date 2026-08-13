import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { DomainCertStatus } from "@webnotary/data-model";
import { hostCertKeys } from "@webnotary/data-model";

export interface DomainCertLookupResult {
  found: boolean;
  status?: DomainCertStatus;
}

export interface DomainCertStore {
  getStatus(hostname: string, certificateSha256: string): Promise<DomainCertLookupResult>;
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
