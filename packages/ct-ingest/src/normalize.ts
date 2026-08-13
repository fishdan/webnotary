import type { X509Certificate } from "node:crypto";
import {
  NormalizationError,
  normalizeCertificateSha256,
  normalizeHostname,
  normalizeSpkiSha256,
  type CertificateInventoryItem,
} from "@webnotary/data-model";
import {
  dnsSans,
  issuerString,
  leafCertificateSha256,
  serialHex,
  spkiSha256,
  validityIso,
} from "./parse.js";

export interface NormalizeCtInput {
  cert: X509Certificate;
  ctSource: string;
  /** ISO-8601 CT entry / observation time; defaults to now for both first/last on create path */
  ctSeenAt?: string;
  nowIso?: string;
}

export type InventoryUpsertFields = Omit<
  CertificateInventoryItem,
  "pk" | "sk" | "ctFirstSeen" | "ctLastSeen" | "derS3Key"
> & {
  ctSeenAt: string;
};

/**
 * Map a leaf certificate + CT provenance into inventory fields.
 * Does not set Dynamo keys or ctFirstSeen/ctLastSeen merge semantics (upsert owns that).
 */
export function normalizeCertificateForInventory(
  input: NormalizeCtInput,
): InventoryUpsertFields {
  const source = input.ctSource.trim();
  if (!source) {
    throw new NormalizationError("ctSource must not be empty");
  }

  const now = input.nowIso ?? new Date().toISOString();
  const ctSeenAt = input.ctSeenAt ?? now;
  const fp = normalizeCertificateSha256(leafCertificateSha256(input.cert));
  const spki = normalizeSpkiSha256(spkiSha256(input.cert));
  const { notBefore, notAfter } = validityIso(input.cert);

  const sans = dnsSans(input.cert)
    .map((name) => {
      try {
        return normalizeHostname(name);
      } catch {
        // Keep lowercased DNS label even if not a perfect hostname (wildcards etc.)
        return name.toLowerCase();
      }
    })
    .filter((name) => !name.includes("*") || name.startsWith("*."));

  return {
    entityType: "CERT_INVENTORY",
    certificateSha256: fp,
    spkiSha256: spki,
    issuer: issuerString(input.cert),
    serial: serialHex(input.cert),
    notBefore,
    notAfter,
    sans,
    ctSource: source,
    updatedAt: now,
    ctSeenAt,
  };
}
