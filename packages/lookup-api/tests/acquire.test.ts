import { describe, expect, it, vi } from "vitest";
import { acquireUnknown, isAcquireModeEnabled, acquireTimeoutMs } from "../src/acquire.js";

describe("acquire env helpers", () => {
  it("parses ACQUIRE_MODE", () => {
    expect(isAcquireModeEnabled({ ACQUIRE_MODE: "true" })).toBe(true);
    expect(isAcquireModeEnabled({ ACQUIRE_MODE: "1" })).toBe(true);
    expect(isAcquireModeEnabled({ ACQUIRE_MODE: "false" })).toBe(false);
    expect(isAcquireModeEnabled({})).toBe(false);
  });

  it("parses ACQUIRE_TIMEOUT_MS", () => {
    expect(acquireTimeoutMs({ ACQUIRE_TIMEOUT_MS: "5000" })).toBe(5000);
    expect(acquireTimeoutMs({})).toBe(5000);
  });
});

describe("acquireUnknown", () => {
  const FP = "a".repeat(64);

  it("returns valid when observed FP matches client and tlsValid", async () => {
    const observeFn = vi.fn().mockResolvedValue({
      hostname: "example.com",
      certificateSha256: FP,
      spkiSha256: "b".repeat(64),
      notBefore: "2026-01-01T00:00:00.000Z",
      notAfter: "2027-01-01T00:00:00.000Z",
      issuer: "CN=test",
      observedAt: "2026-08-13T00:00:00.000Z",
      tlsValid: true,
    });
    const upsertObserved = { upsert: vi.fn().mockResolvedValue(undefined) };

    const result = await acquireUnknown({
      hostname: "example.com",
      clientCertificateSha256: FP,
      deps: { observeFn, upsertObserved, timeoutMs: 5000 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.status).toBe("valid");
    expect(upsertObserved.upsert).toHaveBeenCalled();
  });

  it("returns conflict when observed FP differs", async () => {
    const observeFn = vi.fn().mockResolvedValue({
      hostname: "example.com",
      certificateSha256: "c".repeat(64),
      spkiSha256: "b".repeat(64),
      notBefore: "2026-01-01T00:00:00.000Z",
      notAfter: "2027-01-01T00:00:00.000Z",
      issuer: "CN=test",
      observedAt: "2026-08-13T00:00:00.000Z",
      tlsValid: true,
    });
    const upsertObserved = { upsert: vi.fn().mockResolvedValue(undefined) };

    const result = await acquireUnknown({
      hostname: "example.com",
      clientCertificateSha256: FP,
      deps: { observeFn, upsertObserved, timeoutMs: 5000 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.status).toBe("conflict");
  });

  it("returns timeout when observe exceeds budget", async () => {
    const observeFn = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );
    const upsertObserved = { upsert: vi.fn() };

    const result = await acquireUnknown({
      hostname: "example.com",
      clientCertificateSha256: FP,
      deps: { observeFn, upsertObserved, timeoutMs: 50 },
    });

    expect(result).toEqual(
      expect.objectContaining({ ok: false, reason: "timeout" }),
    );
    expect(upsertObserved.upsert).not.toHaveBeenCalled();
  });
});
