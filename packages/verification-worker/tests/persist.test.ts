import { describe, expect, it, vi } from "vitest";
import { evidenceKey, persistObservation } from "../src/persist.js";
import type { Observation } from "@webnotary/observer";

const obs: Observation = {
  hostname: "example.com",
  remoteIp: "1.2.3.4",
  observedAt: "2026-08-13T12:00:00.000Z",
  observerId: "test",
  tlsValid: true,
  certificateSha256: "b".repeat(64),
  spkiSha256: "c".repeat(64),
  notBefore: "2026-01-01T00:00:00.000Z",
  notAfter: "2027-01-01T00:00:00.000Z",
  issuer: "CN=Test",
  subject: "CN=example.com",
  sans: ["example.com"],
  port: 443,
};

describe("persistObservation", () => {
  it("writes evidence, upserts cert, and clears pending when tlsValid", async () => {
    const putObject = vi.fn();
    const upsertObservedCert = vi.fn();
    const deletePending = vi.fn();

    const key = await persistObservation(
      {
        tableName: "t",
        bucketName: "b",
        putObject,
        upsertObservedCert,
        deletePending,
      },
      obs,
      "a".repeat(64),
    );

    expect(key).toContain("observations/year=2026/month=08/day=13/hour=12/");
    expect(putObject).toHaveBeenCalledOnce();
    expect(upsertObservedCert).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateSha256: obs.certificateSha256,
        evidenceKey: key,
      }),
    );
    expect(deletePending).toHaveBeenCalledWith("example.com");
  });

  it("skips trust upsert when tlsValid is false but still clears pending", async () => {
    const upsertObservedCert = vi.fn();
    const deletePending = vi.fn();
    await persistObservation(
      {
        tableName: "t",
        bucketName: "b",
        putObject: vi.fn(),
        upsertObservedCert,
        deletePending,
      },
      { ...obs, tlsValid: false },
    );
    expect(upsertObservedCert).not.toHaveBeenCalled();
    expect(deletePending).toHaveBeenCalled();
  });
});

describe("evidenceKey", () => {
  it("builds partitioned key", () => {
    expect(evidenceKey(obs)).toMatch(
      /^observations\/year=2026\/month=08\/day=13\/hour=12\/example\.com-[a-f0-9]{64}\.json$/,
    );
  });
});
