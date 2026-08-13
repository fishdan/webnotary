# Feature Specification: CT Inventory Pipeline

**Feature Branch**: `0.006-ct-inventory-pipeline`  
**Created**: 2026-08-13  
**Status**: Spec complete — awaiting decision lock, then implementation  
**Source**: `webnotary.md` § Seeding Path, Step 8; Constitution XXI, XXIV

## Intent

Independently ingest Certificate Transparency (CT) data into the WebNotary **certificate inventory** (`CERT#…` / `META`). CT populates discovery evidence only — it never creates hostname trust (`VALID` / `SINGLE_OBSERVED` / etc.).

This pipeline is separable from the public `/v1/check` path and may run on its own schedule.

## In Scope

- Fetch CT records for a configurable seed list of hostnames (MVP source: crt.sh)
- Normalize into `CertificateInventoryItem` fields from 0.001:
  - `certificateSha256`, `spkiSha256`, `sans`, `issuer`, `serial`, `notBefore`, `notAfter`
  - `ctFirstSeen`, `ctLastSeen`, `ctSource`
- Idempotent DynamoDB upsert of inventory items only
- Local CLI for one-shot / test ingest
- Optional scheduled Lambda (EventBridge) that walks the seed list — **not** on the API latency path
- Unit tests proving inventory writes never mutate `HOST#` / `CERT#` domain-cert trust state

## Out of Scope

- Using inventory as the verification gate (0.007)
- Writing or elevating `DomainCertificateState.status` (including `CT_SEEN` on hostname pairs) — deferred to 0.007 policy
- Treating CT presence as trust / VALID
- Full CT log tailing / Merkle monitoring at Internet scale
- Real-time websocket streams (certstream) as the primary MVP path
- Browser extension (0.008)
- CloudWatch/billing alarms (deferred; same stance as 0.002)
- Retaining full DER in S3 for MVP (fingerprint + metadata only)

## Key Requirements

| ID | Requirement |
|----|-------------|
| R1 | Constitution XXI: CT is evidence, not trust |
| R2 | Constitution XXIV: collection separable from serving |
| R3 | Inventory keys/types follow 0.001 (`CERT#fp` / `META`, `entityType=CERT_INVENTORY`) |
| R4 | Upserts are idempotent: reprocessing the same cert updates timestamps/metadata without duplicates or corruption |
| R5 | Serial stored as lowercase hex string (no leading `0x`) |
| R6 | SANs stored as lowercase / punycode DNS names where applicable; skip IP SANs for MVP inventory list (or store as-is if present, document choice) |
| R7 | Ingest failures for one hostname must not abort the whole seed batch |
| R8 | No dependency from lookup API / observer Lambdas onto the CT package for request serving |

## User Stories

### US1 — Ingest CT records into inventory (P1)

**Given** a seed hostname that has CT-logged certificates  
**When** the ingest job runs  
**Then** one or more `CERT_INVENTORY` items exist with required fingerprints and metadata, and `ctSource` identifies the MVP source.

### US2 — No trust side effects (P1)

**Given** a successful inventory upsert  
**When** inspecting DynamoDB  
**Then** no `HOST#…` / `CERT#…` item is created or updated solely by this pipeline, and no status becomes VALID-equivalent.

### US3 — Re-run safe (P2)

**Given** the same certificate is ingested twice  
**When** the second upsert completes  
**Then** a single inventory item remains; `ctFirstSeen` is preserved; `ctLastSeen` / `updatedAt` advance; other fields converge to the latest parse.

### US4 — Offline / test ingest (P2)

**Given** a PEM or DER leaf certificate file  
**When** the CLI ingests it with an explicit `ctSource`  
**Then** the inventory item is written without calling external CT APIs (useful for tests and air-gapped demos).

## Success Criteria

1. CLI or scheduled job can populate inventory for at least `example.com` (or another seed host) from CT.
2. Automated tests cover normalize + idempotent upsert semantics and the “no HOST# writes” invariant.
3. SpecKit / progress record the locked MVP source and non-goals for 0.007.

## Dependencies

- **Requires**: 0.001 inventory shape; 0.002 table (and optional Lambda/schedule infra)
- **Soft**: existing Albert deploy path for Terraform
- **Enables**: 0.007 CT gate + trust policy
- **Independent of**: browser path; does not require 0.003–0.005 to function (though same table is shared)
