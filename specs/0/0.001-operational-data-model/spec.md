# Feature Specification: Operational Data Model

**Feature Branch**: `0.001-operational-data-model`  
**Created**: 2026-08-13  
**Status**: Specified  
**Source**: `webnotary.md` § Data Model, Step 1; Constitution IX, XXI, XXIII, XXIV

## Intent

Define and encode the minimal DynamoDB operational data model for WebNotary MVP so later specs can provision (0.002) and use (0.003–0.007) a shared, unambiguous schema.

Primary question this model must answer efficiently:

> Is certificate X currently known/trusted for hostname Y?

## In Scope

- Single-table DynamoDB design with exact PK/SK patterns
- Entities: certificate inventory, domain/certificate state, pending verification
- Attribute lists, types, enums, and normalization rules
- Access patterns for the browser lookup path and verification dedupe
- Conditional-create + TTL semantics for pending verification
- Checked-in TypeScript types and key builders as the shared contract
- Explicit separation of client sightings vs observer evidence

## Out of Scope

- Terraform / table provisioning (0.002)
- S3 raw observation object schema beyond a pointer convention note (0.005)
- Trust-policy algorithm that *decides* status transitions (0.007)
- GSIs unless an MVP access pattern proves they are required (none identified)
- Multi-observer attestation fields beyond a simple `observerCount`
- Full CT ingest pipeline (0.006)

## User Scenarios & Testing

### User Story 1 — Lookup by hostname + certificate (Priority: P1)

An API developer looks up whether WebNotary has an operational state for `hostname` + `certificateSha256` and reads a status suitable for mapping to public `valid` / `unknown` / `conflict`.

**Why this priority**: This is the hot path for `POST /v1/check`.

**Independent Test**: Put a domain/cert item; GetItem by constructed keys returns it. Missing item yields empty result (API maps to `unknown`).

**Acceptance Scenarios**:

1. **Given** a stored domain/cert item with `status = VALID`, **When** GetItem uses `HOST#<hostname>` + `CERT#<sha256>`, **Then** the item is returned with observer and client fields intact and distinguishable.
2. **Given** no domain/cert item, **When** GetItem is issued for that pair, **Then** the result is empty (not an error).
3. **Given** a hostname with different casing/trailing dot in input, **When** keys are built via the shared normalizer, **Then** they match the canonical stored form.

---

### User Story 2 — Pending verification dedupe (Priority: P1)

Verification orchestration creates at most one pending verification record per hostname at a time so concurrent unknowns cannot fan out probes.

**Why this priority**: Abuse amplification control is constitutional.

**Independent Test**: Two conditional creates for the same hostname; exactly one succeeds.

**Acceptance Scenarios**:

1. **Given** no pending record for `example.com`, **When** PutItem with `attribute_not_exists(pk)`, **Then** create succeeds with `status = PENDING` and a TTL.
2. **Given** an existing pending record, **When** a second conditional create runs, **Then** it fails with conditional check failure and no second logical pending item exists.
3. **Given** a pending record whose TTL has expired and been deleted by DynamoDB, **When** a new conditional create runs, **Then** create succeeds again.

---

### User Story 3 — Inventory without trust (Priority: P1)

CT/discovery can store a certificate in inventory without creating domain trust.

**Why this priority**: CT is evidence, not trust.

**Independent Test**: Inventory item exists; domain/cert state absent; lookup of a hostname+cert pair still has no VALID state.

**Acceptance Scenarios**:

1. **Given** only `CERT#<sha256>` inventory metadata, **When** domain/cert GetItem runs, **Then** it misses.
2. **Given** inventory present, **When** a future CT-gate reads inventory by fingerprint, **Then** GetItem on inventory keys returns CT metadata including `ctSeen`-equivalent timestamps.

---

### User Story 4 — Client sighting vs observer evidence (Priority: P1)

Client reports may update client sighting counters/timestamps but must not be representable as observer evidence or as a trust grant in the schema.

**Why this priority**: Core trust boundary.

**Independent Test**: Schema/types expose separate client_* and observer_* fields; no single field conflates them; documentation forbids client updates to `status = VALID`.

**Acceptance Scenarios**:

1. **Given** a domain/cert item, **When** a client sighting update is applied, **Then** only client sighting fields change.
2. **Given** schema review, **When** inspecting attributes, **Then** observer fields and client fields are distinct and documented.

### Edge Cases

- Hostname is an IP literal → rejected by normalization (observers/API validate; model stores DNS hostnames only).
- Empty or non-hex certificate fingerprint → rejected before key build.
- Extremely long hostname → rejected above max length (253).
- Pending record exists but work already completed → 0.005 must clear/replace pending; model supports delete of pending item and TTL safety net.
- Multiple certificates for one hostname → multiple `CERT#` items under same `HOST#` PK; Query possible later without GSI.

## Requirements

### Functional Requirements

- **FR-001**: System MUST use a single DynamoDB table for MVP operational entities (inventory, domain/cert state, pending verification).
- **FR-002**: System MUST address domain/cert state with `pk = HOST#<canonicalHostname>` and `sk = CERT#<certificateSha256>`.
- **FR-003**: System MUST address certificate inventory with `pk = CERT#<certificateSha256>` and `sk = META`.
- **FR-004**: System MUST address pending verification with `pk = VERIFY#<canonicalHostname>` and `sk = PENDING`.
- **FR-005**: System MUST normalize hostnames before key construction: lowercase ASCII/punycode (IDNA), strip trailing dot, reject empty/IP literals/invalid DNS labels, max 253 characters.
- **FR-006**: System MUST normalize certificate fingerprints as lowercase hex-encoded SHA-256 (64 hex chars) of the leaf certificate DER.
- **FR-007**: Domain/cert items MUST store `status` as an operational trust-state string written only by trusted backend policy/observer flows—not by raw client assertion.
- **FR-008**: Domain/cert items MUST keep client sighting fields (`firstClientSeen`, `lastClientSeen`, `clientSeenCount`) separate from observer fields (`firstObserved`, `lastObserved`, `observationCount`, `observerCount`).
- **FR-009**: Pending verification creates MUST use a condition equivalent to `attribute_not_exists(pk)` (or equivalent item absence condition) so only the first creator wins.
- **FR-010**: Pending verification items MUST include a DynamoDB TTL attribute (`expiresAt`, epoch seconds) with MVP default TTL of 900 seconds after `requestedAt`.
- **FR-011**: Inventory items MUST be interpretable as CT/discovery evidence only; presence MUST NOT imply domain trust.
- **FR-012**: The shared TypeScript module MUST expose key builders and types used by later Lambdas so key formatting cannot drift.
- **FR-013**: MVP MUST NOT require a GSI; all specified access patterns MUST work with GetItem, PutItem, UpdateItem, DeleteItem, and optional Query on a single PK.
- **FR-014**: Raw observation history MUST NOT be modeled as unbounded DynamoDB items; optional `lastEvidenceS3Key` pointer on domain/cert state is allowed.

### Key Entities

- **CertificateInventoryItem**: CT/discovery metadata for a certificate fingerprint.
- **DomainCertificateState**: Current operational relationship between one hostname and one certificate fingerprint.
- **PendingVerification**: Short-lived dedupe lock that a hostname needs (or is undergoing) independent observation.

## Success Criteria

- **SC-001**: A reviewer can implement Terraform table attributes/keys from `data-model.md` alone without reading chat history.
- **SC-002**: Primary lookup is a single GetItem (no scan, no GSI).
- **SC-003**: Pending dedupe is expressible as one conditional PutItem.
- **SC-004**: Unit tests cover hostname/fingerprint normalization and key builders (≥95% on those modules).
- **SC-005**: Documentation explicitly states that client sightings cannot encode trust.

## Assumptions

- One AWS region / one table for MVP.
- On-Demand DynamoDB billing capacity.
- Public API status mapping (`valid`/`unknown`/`conflict`) is performed by the lookup layer from stored `status` (and absence → unknown); exact enum evolution is owned by 0.007 but initial stored values are defined here.
- S3 evidence layout is owned by 0.005; this spec only allows an optional pointer field.
- Punycode conversion may use a small well-maintained IDNA library when implemented in TypeScript.

## Dependencies

- None upstream.
- Downstream: 0.002 (provision), 0.003 (lookup), 0.005 (pending + evidence pointer), 0.006 (inventory writes), 0.007 (status transitions).
