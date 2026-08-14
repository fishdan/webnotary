import type { DomainCertStatus } from "@webnotary/data-model";

export type PublicStatus = "valid" | "unknown" | "conflict";

/**
 * Maps stored DomainCertificateState.status (or missing item) to public API status.
 *
 * DEV POLICY: SINGLE_OBSERVED → valid. This is temporary — not production
 * multi-observer consensus. See package README.
 */
export function toPublicStatus(
  stored: DomainCertStatus | undefined | null,
): PublicStatus {
  if (stored == null) {
    return "unknown";
  }

  switch (stored) {
    case "SINGLE_OBSERVED":
    case "MULTI_OBSERVED":
    case "ESTABLISHED":
      return "valid";
    case "CONFLICT":
      return "conflict";
    case "UNKNOWN":
    case "CT_SEEN":
      return "unknown";
    default:
      return "unknown";
  }
}

/** @deprecated Use toPublicStatus — alias for callers migrating from mapStatus. */
export const mapStatus = toPublicStatus;

export function shouldEnqueueVerification(input: {
  publicStatus: PublicStatus;
  inventoryKnown: boolean;
  /** When true, unknown checks may enqueue without CT inventory (acquire / bootstrap mode). */
  acquireMode?: boolean;
}): boolean {
  if (input.publicStatus !== "unknown") return false;
  if (input.acquireMode) return true;
  return input.inventoryKnown === true;
}


/** Statuses that mean WebNotary has independently observed a cert for the host. */
export const OBSERVED_TRUST_STATUSES: ReadonlySet<DomainCertStatus> = new Set([
  "SINGLE_OBSERVED",
  "MULTI_OBSERVED",
  "ESTABLISHED",
]);

export interface SiblingCert {
  certificateSha256: string;
  status: DomainCertStatus;
}

/**
 * MVP CONFLICT: client FP differs from a sibling cert that is already
 * independently observed for the same hostname.
 * Cert rotation may look like conflict until policy evolves — accepted for MVP.
 */
export function detectConflictFromSiblings(input: {
  clientCertificateSha256: string;
  siblings: SiblingCert[];
}): boolean {
  return conflictingObservedFingerprints(input).length > 0;
}

/** Observed/trusted sibling fingerprints that differ from the client leaf. */
export function conflictingObservedFingerprints(input: {
  clientCertificateSha256: string;
  siblings: SiblingCert[];
}): string[] {
  const client = input.clientCertificateSha256.toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const sibling of input.siblings) {
    if (!OBSERVED_TRUST_STATUSES.has(sibling.status)) continue;
    const fp = sibling.certificateSha256.toLowerCase();
    if (fp === client || seen.has(fp)) continue;
    seen.add(fp);
    out.push(fp);
  }
  return out;
}

/** Count distinct independently observed leaves for a hostname (from sibling rows). */
export function countObservedLeaves(siblings: SiblingCert[]): number {
  const seen = new Set<string>();
  for (const sibling of siblings) {
    if (!OBSERVED_TRUST_STATUSES.has(sibling.status)) continue;
    seen.add(sibling.certificateSha256.toLowerCase());
  }
  return seen.size;
}

export type ConflictSeverity = "info" | "attention" | "alert";

/**
 * Classify a fingerprint conflict for UX — not a change to detection math.
 *
 * - info: multi-cert public surface or client leaf known in CT inventory
 * - attention: single observed public leaf and client leaf not in CT (path mismatch story)
 * - alert: reserved for stronger multi-observer policy later
 */
export function classifyConflictSeverity(input: {
  observedLeafCount: number;
  clientInCtInventory: boolean;
}): ConflictSeverity {
  if (input.clientInCtInventory) return "info";
  if (input.observedLeafCount >= 2) return "info";
  return "attention";
}

export function conflictSummary(severity: ConflictSeverity): string {
  switch (severity) {
    case "info":
      return "Your browser accepted a certificate that differs from one WebNotary has observed for this host. This host appears to use multiple certificates (or yours is in CT inventory) — often normal for large sites, not proof of attack.";
    case "attention":
      return "Your browser accepted a certificate that differs from what WebNotary observes for this host on the public internet. That can indicate a proxy, middlebox, or unexpected path — not that PKI failed in the browser.";
    case "alert":
      return "Strong path mismatch: the certificate in your browser does not match independent public observations for this host.";
    default:
      return "Certificate fingerprint disagrees with WebNotary public observation.";
  }
}
