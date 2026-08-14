import type { ConflictSeverity } from "@webnotary/trust-policy";

/**
 * Conflict detail returned alongside public status when status === "conflict".
 * Backward compatible: clients that ignore unknown fields still work.
 */
export interface ConflictDetail {
  /** Why the API classified this check as conflict. */
  reason: "sibling_observed" | "stored_conflict" | "acquire_mismatch";
  /** Leaf fingerprints WebNotary already knows for this hostname (observed / trusted). */
  knownCertificateSha256s: string[];
  /** UX severity — detection math unchanged. */
  severity: ConflictSeverity;
  signals: {
    /** Browser already accepted this leaf under local PKI for the page load. */
    browserPkiAssumed: boolean;
    /** Distinct independently observed leaves for this hostname. */
    observedLeafCount: number;
    /** Client leaf present in CT inventory (CERT#/META). */
    clientInCtInventory: boolean;
  };
  /** Human-readable path-vs-public-observation summary. */
  summary: string;
}

export interface CheckSuccessBody {
  status: "valid" | "unknown" | "conflict";
  conflict?: ConflictDetail;
}
