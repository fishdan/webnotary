import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadCertificateFromPem } from "../src/parse.js";
import { normalizeCertificateForInventory } from "../src/normalize.js";

const dir = dirname(fileURLToPath(import.meta.url));
const pem = readFileSync(join(dir, "fixtures/leaf.crt"), "utf8");

describe("normalizeCertificateForInventory", () => {
  it("maps leaf fields and CT provenance", () => {
    const cert = loadCertificateFromPem(pem);
    const fields = normalizeCertificateForInventory({
      cert,
      ctSource: "file",
      ctSeenAt: "2026-01-01T00:00:00.000Z",
      nowIso: "2026-01-02T00:00:00.000Z",
    });

    expect(fields.entityType).toBe("CERT_INVENTORY");
    expect(fields.certificateSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fields.spkiSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fields.serial).toMatch(/^[0-9a-f]+$/);
    expect(fields.issuer).toMatch(/CN=example\.com/i);
    expect(fields.sans).toEqual(expect.arrayContaining(["example.com", "www.example.com"]));
    expect(fields.ctSource).toBe("file");
    expect(fields.ctSeenAt).toBe("2026-01-01T00:00:00.000Z");
    expect(fields.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(fields.notBefore).toMatch(/^\d{4}-/);
    expect(fields.notAfter).toMatch(/^\d{4}-/);
  });

  it("rejects empty ctSource", () => {
    const cert = loadCertificateFromPem(pem);
    expect(() =>
      normalizeCertificateForInventory({ cert, ctSource: "  " }),
    ).toThrow(/ctSource/);
  });
});
