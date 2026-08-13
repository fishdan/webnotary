# Research: Operational Data Model

**Feature**: 0.001-operational-data-model  
**Date**: 2026-08-13

## Decision: Single-table DynamoDB

**Choice**: One table `webnotary` with prefixed `pk`/`sk`.

**Alternatives considered**:
- Three tables (inventory / state / pending) — clearer isolation, more IAM/Terraform surface for MVP.
- Document-per-domain with nested cert maps — rejected by `webnotary.md` (unbounded growth, poor key access).

**Rationale**: MVP access patterns are GetItem-shaped; single table matches constitution minimalism and still allows `Query` on `HOST#` later.

## Decision: No GSI for MVP

**Choice**: Primary keys only.

**Rationale**: Browser path is exact pair lookup; pending work is one item per hostname; CT gate is exact fingerprint lookup.

## Decision: Stored status enum includes internal progression

**Choice**: Store richer statuses (`UNKNOWN`, `CT_SEEN`, `SINGLE_OBSERVED`, …, `CONFLICT`) rather than only public `valid|unknown|conflict`.

**Rationale**: Constitution allows richer internal model; lookup layer maps to public API; 0.007 owns transition rules.

## Decision: Pending TTL = 900 seconds

**Choice**: 15 minutes default.

**Alternatives**: 1h (slower recovery from stuck workers), 5m (more re-probe churn).

**Rationale**: Bounds stuck locks quickly for early development; 0.005 may tune via config without schema change.

## Decision: Fingerprint = lowercase hex SHA-256 of leaf DER

**Choice**: 64-char hex, lowercase.

**Rationale**: Common CT/tooling interchange; avoids base64 padding ambiguity in keys.

## Decision: Hostnames stored as ASCII punycode, lowercased

**Choice**: IDNA convert then lowercase; reject IP literals in MVP keys.

**Rationale**: Stable equality for GetItem; IP literal HTTPS is non-goal for initial browser extension path.
