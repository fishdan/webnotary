import { describe, expect, it, vi } from "vitest";
import { assertInventoryOnlyKey, createDynamoInventoryUpserter } from "../src/upsert.js";
import type { InventoryUpsertFields } from "../src/normalize.js";

const sample: InventoryUpsertFields = {
  entityType: "CERT_INVENTORY",
  certificateSha256: "a".repeat(64),
  spkiSha256: "b".repeat(64),
  issuer: "CN=test",
  serial: "01ab",
  notBefore: "2026-01-01T00:00:00.000Z",
  notAfter: "2027-01-01T00:00:00.000Z",
  sans: ["example.com"],
  ctSource: "crt.sh",
  updatedAt: "2026-02-01T00:00:00.000Z",
  ctSeenAt: "2026-01-15T00:00:00.000Z",
};

describe("createDynamoInventoryUpserter", () => {
  it("writes only CERT#/META keys and preserves ctFirstSeen via if_not_exists", async () => {
    const send = vi.fn().mockResolvedValue({});
    const client = { send } as never;
    const upserter = createDynamoInventoryUpserter("webnotary-dev-table", client);

    await upserter.upsert(sample);

    expect(send).toHaveBeenCalledTimes(1);
    const cmd = send.mock.calls[0]![0] as {
      input: {
        TableName: string;
        Key: { pk: string; sk: string };
        UpdateExpression: string;
        ExpressionAttributeValues: Record<string, unknown>;
      };
    };
    expect(cmd.input.TableName).toBe("webnotary-dev-table");
    expect(cmd.input.Key).toEqual({
      pk: `CERT#${"a".repeat(64)}`,
      sk: "META",
    });
    assertInventoryOnlyKey(cmd.input.Key.pk, cmd.input.Key.sk);
    expect(cmd.input.Key.pk.startsWith("HOST#")).toBe(false);
    expect(cmd.input.UpdateExpression).toContain(
      "ctFirstSeen = if_not_exists(ctFirstSeen, :ctSeenAt)",
    );
    expect(cmd.input.UpdateExpression).toContain("ctLastSeen = :ctSeenAt");
    expect(cmd.input.ExpressionAttributeValues[":ctSource"]).toBe("crt.sh");
  });
});

describe("assertInventoryOnlyKey", () => {
  it("rejects HOST# keys", () => {
    expect(() => assertInventoryOnlyKey("HOST#example.com", "CERT#abc")).toThrow(
      /forbidden/,
    );
  });
});
