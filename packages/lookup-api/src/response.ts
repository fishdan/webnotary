/**
 * Conflict detail returned alongside public status when status === "conflict".
 * Backward compatible: clients that ignore unknown fields still work.
 */
export interface ConflictDetail {
  /** Why the API classified this check as conflict. */
  reason: "sibling_observed" | "stored_conflict" | "acquire_mismatch";
  /** Leaf fingerprints WebNotary already knows for this hostname (observed / trusted). */
  knownCertificateSha256s: string[];
}

export interface CheckSuccessBody {
  status: "valid" | "unknown" | "conflict";
  conflict?: ConflictDetail;
}
