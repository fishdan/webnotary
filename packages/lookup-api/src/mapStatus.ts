import type { DomainCertStatus } from "@webnotary/data-model";

export type PublicStatus = "valid" | "unknown" | "conflict";

/**
 * Maps stored DomainCertificateState.status (or missing item) to public API status.
 * Authority: specs/0/0.003-lookup-api/contracts/status-mapping.md
 */
export function mapStatus(stored: DomainCertStatus | undefined | null): PublicStatus {
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
