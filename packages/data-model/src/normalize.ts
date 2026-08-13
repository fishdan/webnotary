import { isIP } from "node:net";
import { domainToASCII } from "node:url";

export class NormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NormalizationError";
  }
}

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Canonical hostname for WebNotary keys.
 * ASCII/punycode, lowercased, no trailing dot. Rejects IP literals.
 */
export function normalizeHostname(input: string): string {
  if (typeof input !== "string") {
    throw new NormalizationError("hostname must be a string");
  }

  let host = input.trim();
  if (!host) {
    throw new NormalizationError("hostname must not be empty");
  }

  if (host.endsWith(".")) {
    host = host.slice(0, -1);
  }

  if (!host) {
    throw new NormalizationError("hostname must not be empty");
  }

  // Bracketed IPv6 or any IP literal is out of scope for MVP keys.
  const unbracketed =
    host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (isIP(unbracketed)) {
    throw new NormalizationError("IP literal hostnames are not supported in MVP keys");
  }

  const ascii = domainToASCII(host);
  if (!ascii) {
    throw new NormalizationError("hostname could not be converted to ASCII/punycode");
  }

  const canonical = ascii.toLowerCase();

  if (canonical.length > 253) {
    throw new NormalizationError("hostname exceeds 253 characters");
  }

  const labels = canonical.split(".");
  if (labels.some((label) => label.length === 0)) {
    throw new NormalizationError("hostname contains an empty DNS label");
  }

  for (const label of labels) {
    if (label.length > 63 || !DNS_LABEL.test(label)) {
      throw new NormalizationError(`invalid DNS label: ${label}`);
    }
  }

  return canonical;
}

/**
 * Lowercase hex SHA-256 (64 chars) of leaf certificate DER (or SPKI DER).
 */
export function normalizeSha256Hex(input: string, fieldName = "fingerprint"): string {
  if (typeof input !== "string") {
    throw new NormalizationError(`${fieldName} must be a string`);
  }

  const value = input.trim().toLowerCase();
  if (!HEX64.test(value)) {
    throw new NormalizationError(
      `${fieldName} must be a 64-character lowercase hex SHA-256 digest`,
    );
  }

  return value;
}

export function normalizeCertificateSha256(input: string): string {
  return normalizeSha256Hex(input, "certificateSha256");
}

export function normalizeSpkiSha256(input: string): string {
  return normalizeSha256Hex(input, "spkiSha256");
}
