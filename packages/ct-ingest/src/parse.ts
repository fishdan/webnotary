import { createHash, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";

export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function loadCertificateFromPem(pem: string): X509Certificate {
  return new X509Certificate(pem);
}

export function loadCertificateFromDer(der: Buffer): X509Certificate {
  return new X509Certificate(der);
}

export function loadCertificateFromFile(
  path: string,
  format: "pem" | "der",
): X509Certificate {
  const buf = readFileSync(path);
  if (format === "pem") {
    return loadCertificateFromPem(buf.toString("utf8"));
  }
  return loadCertificateFromDer(buf);
}

export function leafCertificateSha256(cert: X509Certificate): string {
  return sha256Hex(cert.raw);
}

export function spkiSha256(cert: X509Certificate): string {
  const spki = cert.publicKey.export({ type: "spki", format: "der" });
  return sha256Hex(spki as Buffer);
}

/** Serial as lowercase hex without 0x prefix (Node gives hex already). */
export function serialHex(cert: X509Certificate): string {
  return cert.serialNumber.toLowerCase().replace(/^0x/, "");
}

/**
 * DNS SANs only (lowercase). IP SANs are skipped for MVP inventory lists.
 * Values that fail hostname normalization are kept lowercased as seen.
 */
export function dnsSans(cert: X509Certificate): string[] {
  const san = cert.subjectAltName;
  if (!san) return [];
  const out: string[] = [];
  for (const part of san.split(",")) {
    const trimmed = part.trim();
    const dns = trimmed.match(/^DNS:(.+)$/i);
    if (dns?.[1]) {
      out.push(dns[1].toLowerCase());
    }
  }
  return [...new Set(out)];
}

export function issuerString(cert: X509Certificate): string {
  return cert.issuer;
}

export function validityIso(cert: X509Certificate): {
  notBefore: string;
  notAfter: string;
} {
  return {
    notBefore: new Date(cert.validFrom).toISOString(),
    notAfter: new Date(cert.validTo).toISOString(),
  };
}
