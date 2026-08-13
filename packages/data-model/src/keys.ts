import {
  normalizeCertificateSha256,
  normalizeHostname,
} from "./normalize.js";
import type { DynamoKeys } from "./types.js";
import { PENDING_VERIFY_TTL_SECONDS } from "./types.js";

export function hostCertKeys(
  hostname: string,
  certificateSha256: string,
): DynamoKeys {
  const h = normalizeHostname(hostname);
  const fp = normalizeCertificateSha256(certificateSha256);
  return {
    pk: `HOST#${h}`,
    sk: `CERT#${fp}`,
  };
}

export function certInventoryKeys(certificateSha256: string): DynamoKeys {
  const fp = normalizeCertificateSha256(certificateSha256);
  return {
    pk: `CERT#${fp}`,
    sk: "META",
  };
}

export function pendingVerifyKeys(hostname: string): DynamoKeys {
  const h = normalizeHostname(hostname);
  return {
    pk: `VERIFY#${h}`,
    sk: "PENDING",
  };
}

/** ConditionExpression for first-writer-wins pending create */
export const PENDING_CREATE_CONDITION = "attribute_not_exists(pk)";

export function pendingExpiresAt(
  nowMs: number = Date.now(),
  ttlSeconds: number = PENDING_VERIFY_TTL_SECONDS,
): number {
  return Math.floor(nowMs / 1000) + ttlSeconds;
}
