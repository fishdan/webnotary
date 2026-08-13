import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { collectFromCrtSh } from "../src/crtsh.js";
import type { CrtShClient } from "../src/crtsh.js";

const dir = dirname(fileURLToPath(import.meta.url));
const pem = readFileSync(join(dir, "fixtures/leaf.crt"), "utf8");

describe("collectFromCrtSh", () => {
  it("dedupes by fingerprint and respects maxCertsPerHost", async () => {
    const fetchPem = vi.fn().mockResolvedValue(pem);
    const client: CrtShClient = {
      searchByHostname: async () => [
        { id: 1, entry_timestamp: "2024-01-01T00:00:00" },
        { id: 2, entry_timestamp: "2024-06-01T00:00:00" },
        { id: 3, entry_timestamp: "2025-01-01T00:00:00" },
      ],
      fetchCertificatePem: fetchPem,
    };

    const items = await collectFromCrtSh({
      hostname: "example.com",
      client,
      maxCertsPerHost: 2,
    });

    expect(fetchPem).toHaveBeenCalledTimes(2);
    // Same PEM → one inventory item
    expect(items).toHaveLength(1);
    expect(items[0]!.ctSource).toBe("crt.sh");
    expect(items[0]!.certificateSha256).toBe(
      new X509Certificate(pem).fingerprint256.replace(/:/g, "").toLowerCase(),
    );
  });
});
