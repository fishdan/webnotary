# Feature Specification: Operational Data Model

**Feature Branch**: `0.001-operational-data-model`  
**Created**: 2026-08-13  
**Status**: Stub  
**Source**: `webnotary.md` § Data Model, Step 1

## Intent

Define the minimal DynamoDB-oriented operational data model for WebNotary MVP:

- Certificate inventory (CT/discovery evidence, not trust)
- Domain/certificate current state
- Pending verification / deduplication

Optimize first for: *Is certificate X valid for hostname Y?*

## In Scope

- Exact partition/sort keys and minimum attributes for MVP
- Distinction between client sightings and observer evidence
- Pending verification record with conditional create + TTL
- Documented access patterns for the lookup path

## Out of Scope

- Secondary indexes beyond what the primary lookup requires
- S3 observation schema details (covered later with observer/evidence work)
- Trust-policy algorithm (0.007)
- Infrastructure provisioning (0.002)

## Key Requirements (from constitution / webnotary.md)

- Clients never create trust; client and observer evidence remain distinct
- CT inventory records mean `CT_SEEN`, not trusted
- Do not model one ever-growing document per domain
- Pending verification must dedupe by hostname
- Amplification controls: garbage fingerprints must not force durable cert writes

## User Stories (stub)

### US1 — Primary lookup key design (P1)

A developer can store and retrieve a hostname + certificateSha256 pair and determine current operational status.

**Independent Test**: Put/get known pair; missing pair returns not-found semantics suitable for `UNKNOWN`.

### US2 — Pending verification dedupe (P1)

Only the first concurrent unknown for a hostname creates a pending verification record.

**Independent Test**: Conditional create succeeds once; subsequent creates fail or no-op without duplicate work markers.

### US3 — Inventory vs trust separation (P2)

Certificate inventory entries can exist without implying domain trust.

**Independent Test**: Inventory item present; domain/cert state absent → lookup remains non-VALID.

## Acceptance Criteria (stub)

- [ ] Keys and attributes documented in this spec (or linked data-model.md)
- [ ] Client fields vs observer fields explicitly separated
- [ ] Pending verification TTL and conditional-create semantics defined
- [ ] No premature GSI design

## Dependencies

- None (foundation for 0.002–0.005)

## Notes

Flesh out via `/speckit-specify` / `/speckit-plan` before implementation on branch `0.001-operational-data-model`.
