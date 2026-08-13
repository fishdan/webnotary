/**
 * Shared operational data-model types for WebNotary MVP.
 * Schema authority: specs/0/0.001-operational-data-model/data-model.md
 */

export type EntityType = "DOMAIN_CERT" | "CERT_INVENTORY" | "PENDING_VERIFY";

/**
 * Stored operational status on DomainCertificateState.
 * Public API mapping is owned by the lookup layer / trust policy (0.003 / 0.007).
 */
export type DomainCertStatus =
  | "UNKNOWN"
  | "CT_SEEN"
  | "SINGLE_OBSERVED"
  | "MULTI_OBSERVED"
  | "ESTABLISHED"
  | "CONFLICT";

export type PendingStatus = "PENDING";

export interface DynamoKeys {
  pk: string;
  sk: string;
}

export interface DomainCertificateState {
  pk: string;
  sk: string;
  entityType: "DOMAIN_CERT";
  hostname: string;
  certificateSha256: string;
  spkiSha256?: string;
  status: DomainCertStatus;
  notBefore?: string;
  notAfter?: string;
  issuer?: string;
  ctSeen?: boolean;
  firstObserved?: string;
  lastObserved?: string;
  observationCount?: number;
  observerCount?: number;
  firstClientSeen?: string;
  lastClientSeen?: string;
  clientSeenCount?: number;
  lastEvidenceS3Key?: string;
  updatedAt: string;
}

export interface CertificateInventoryItem {
  pk: string;
  sk: string;
  entityType: "CERT_INVENTORY";
  certificateSha256: string;
  spkiSha256?: string;
  issuer?: string;
  serial?: string;
  notBefore?: string;
  notAfter?: string;
  sans?: string[];
  ctFirstSeen?: string;
  ctLastSeen?: string;
  ctSource?: string;
  derS3Key?: string;
  updatedAt: string;
}

export interface PendingVerification {
  pk: string;
  sk: string;
  entityType: "PENDING_VERIFY";
  hostname: string;
  status: PendingStatus;
  requestedAt: string;
  requestedCertificateSha256?: string;
  /** Epoch seconds — DynamoDB TTL attribute */
  expiresAt: number;
  updatedAt: string;
}

/** MVP default pending lock lifetime */
export const PENDING_VERIFY_TTL_SECONDS = 900;
