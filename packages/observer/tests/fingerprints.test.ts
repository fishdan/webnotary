import { X509Certificate, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { leafCertificateSha256, sha256Hex, spkiSha256 } from "../src/fingerprints.js";

// Minimal self-signed cert for hashing tests via openssl-less approach:
// Node doesn't easily mint certs without extra deps; hash of raw buffers is enough for sha256Hex.
describe("sha256Hex", () => {
  it("hashes deterministically", () => {
    expect(sha256Hex(Buffer.from("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("certificate fingerprints", () => {
  it("computes leaf and spki hashes for a generated cert when available", async () => {
    // Use tls to create nothing — instead import a tiny fixture PEM.
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    // Without a full X509 builder in stdlib, validate spki export path via publicKey.
    const spki = publicKey.export({ type: "spki", format: "der" }) as Buffer;
    expect(sha256Hex(spki)).toHaveLength(64);

    // Build a self-signed cert using Node 20+ undocumented? Skip if unavailable.
    // Fallback: ensure functions accept X509Certificate from a known PEM.
    const pem = await import("node:child_process").then(async (cp) => {
      try {
        return cp
          .execSync(
            'openssl req -x509 -new -nodes -newkey rsa:2048 -keyout /dev/null -out /dev/stdout -days 1 -subj "/CN=test.example" 2>/dev/null',
            { encoding: "utf8" },
          )
          .trim();
      } catch {
        return null;
      }
    });

    if (!pem || !pem.includes("BEGIN CERTIFICATE")) {
      expect(spki.length).toBeGreaterThan(0);
      void privateKey;
      return;
    }

    const cert = new X509Certificate(pem);
    expect(leafCertificateSha256(cert)).toMatch(/^[0-9a-f]{64}$/);
    expect(spkiSha256(cert)).toMatch(/^[0-9a-f]{64}$/);
  });
});
