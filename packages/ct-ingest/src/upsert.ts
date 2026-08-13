import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  type DynamoDBDocumentClient as DocClient,
} from "@aws-sdk/lib-dynamodb";
import { certInventoryKeys } from "@webnotary/data-model";
import type { InventoryUpsertFields } from "./normalize.js";

export interface InventoryUpserter {
  upsert(fields: InventoryUpsertFields): Promise<void>;
}

/**
 * Idempotent inventory write. Only touches CERT# / META keys.
 * Preserves ctFirstSeen; advances ctLastSeen / updatedAt; refreshes metadata.
 */
export function createDynamoInventoryUpserter(
  tableName: string,
  client: DocClient = DynamoDBDocumentClient.from(new DynamoDBClient({})),
): InventoryUpserter {
  return {
    async upsert(fields) {
      const keys = certInventoryKeys(fields.certificateSha256);
      // Hard invariant: inventory keys only — never HOST# / VERIFY#
      if (!keys.pk.startsWith("CERT#") || keys.sk !== "META") {
        throw new Error(`refusing non-inventory keys: ${keys.pk}/${keys.sk}`);
      }

      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: keys.pk, sk: keys.sk },
          UpdateExpression: `
            SET entityType = :entityType,
                certificateSha256 = :fp,
                spkiSha256 = :spki,
                issuer = :issuer,
                serial = :serial,
                notBefore = :notBefore,
                notAfter = :notAfter,
                sans = :sans,
                ctSource = :ctSource,
                ctFirstSeen = if_not_exists(ctFirstSeen, :ctSeenAt),
                ctLastSeen = :ctSeenAt,
                updatedAt = :updatedAt
          `,
          ExpressionAttributeValues: {
            ":entityType": "CERT_INVENTORY",
            ":fp": fields.certificateSha256,
            ":spki": fields.spkiSha256,
            ":issuer": fields.issuer,
            ":serial": fields.serial,
            ":notBefore": fields.notBefore,
            ":notAfter": fields.notAfter,
            ":sans": fields.sans,
            ":ctSource": fields.ctSource,
            ":ctSeenAt": fields.ctSeenAt,
            ":updatedAt": fields.updatedAt,
          },
        }),
      );
    },
  };
}

/** Test helper: wrap a mock that records UpdateCommand inputs. */
export function assertInventoryOnlyKey(pk: string, sk: string): void {
  if (!pk.startsWith("CERT#") || sk !== "META") {
    throw new Error(`HOST#/VERIFY# writes are forbidden in CT ingest: ${pk}/${sk}`);
  }
}
