# Feature Specification: CT Inventory Pipeline

**Feature Branch**: `0.006-ct-inventory-pipeline`  
**Created**: 2026-08-13  
**Status**: Stub  
**Source**: `webnotary.md` § Seeding Path, Step 8

## Intent

Independently ingest Certificate Transparency data into the certificate inventory. CT populates evidence only — never trust decisions.

## In Scope

- CT consumption / normalization
- Inventory fields: certificateSha256, spkiSha256, SANs, issuer, serial, validity, CT timestamps/source
- Separation from public WebNotary request path
- Idempotent upserts into inventory

## Out of Scope

- Making VALID/CONFLICT decisions (0.007)
- Using CT alone as trust
- Browser extension

## Key Requirements

- Constitution XXI: CT is evidence, not trust
- Constitution XXIV: collection separable from serving
- May run before the rest of WebNotary is complete

## User Stories (stub)

### US1 — Ingest CT records into inventory (P1)

Known CT-logged cert appears in inventory with required fields.

### US2 — No trust side effects (P1)

Inventory write does not mark hostname/cert VALID.

### US3 — Re-run safe (P2)

Reprocessing logs does not corrupt inventory (idempotent).

## Dependencies

- Requires: 0.001 inventory shape
- Soft: 0.002 for storage/compute
- Enables: 0.007
- Parallelizable with 0.003–0.005
