import { createHash, type X509Certificate } from "node:crypto";

export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function leafCertificateSha256(cert: X509Certificate): string {
  return sha256Hex(cert.raw);
}

export function spkiSha256(cert: X509Certificate): string {
  const spki = cert.publicKey.export({ type: "spki", format: "der" });
  return sha256Hex(spki as Buffer);
}

export function parseSans(cert: X509Certificate): string[] {
  const san = cert.subjectAltName;
  if (!san) return [];
  // e.g. "DNS:example.com, DNS:www.example.com, IP Address:1.2.3.4"
  return san
    .split(",")
    .map((part) => part.trim())
    .map((part) => {
      const dns = part.match(/^DNS:(.+)$/i);
      if (dns) return dns[1]!.toLowerCase();
      return null;
    })
    .filter((v): v is string => Boolean(v));
}
