/**
 * Re-exports public status mapping from @webnotary/trust-policy.
 * Prefer importing from @webnotary/trust-policy in new code.
 */
export {
  toPublicStatus as mapStatus,
  type PublicStatus,
} from "@webnotary/trust-policy";
