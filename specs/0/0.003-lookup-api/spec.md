# Feature Specification: Lookup API

**Feature Branch**: `0.003-lookup-api`  
**Created**: 2026-08-13  
**Status**: Specified (awaiting review)  
**Source**: `webnotary.md` § Public API, Step 3; Constitution XXI–XXIII, XXV  
**Depends on**: 0.001 (`data-model` + `@webnotary/data-model`), 0.002 (`infra` HTTP API + DynamoDB)

## Intent

Implement `POST /v1/check` as a small, deterministic lookup that reads DynamoDB and returns public trust states — without live TLS probing and without enqueueing verification work (that is 0.005).

## In Scope

- Request contract: JSON `{ hostname, certificateSha256 }`
- Strict validation/normalization via `@webnotary/data-model`
- DynamoDB `GetItem` on `HOST#` / `CERT#`
- Public response: `{ "status": "valid" | "unknown" | "conflict" }`
- Status mapping from stored `DomainCertStatus` (and absence → `unknown`)
- TypeScript Lambda handler package with unit tests
- Wire handler to API Gateway HTTP API `POST /v1/check` (Terraform)
- **IAM role for the lookup Lambda** (required for AWS deploy; see open question)

## Out of Scope

- Live TLS / observer work on the request path
- SQS enqueue / pending verification (0.005)
- CT inventory gate (0.007)
- Client-sighting counter writes (defer; keep 0.003 read-only)
- Trust-policy evolution beyond a documented static mapping table
- Custom domain / auth for public lookups
- Chrome extension (0.008)

## User Scenarios & Testing

### User Story 1 — Known trusted pair returns valid (P1)

**Given** a domain/cert item whose stored status maps to public `valid`, **When** `POST /v1/check` is called with that hostname + fingerprint, **Then** response is `200` with `{ "status": "valid" }`.

**Independent Test**: Seed DynamoDB item; invoke handler or HTTP API; assert body.

### User Story 2 — Missing pair returns unknown (P1)

**Given** no domain/cert item, **When** check is called, **Then** `{ "status": "unknown" }` with **no** SQS send and **no** DynamoDB write.

**Independent Test**: Call against empty keys; assert no side-effect mocks called.

### User Story 3 — Conflict status surfaces (P1)

**Given** stored `status = CONFLICT`, **When** check is called, **Then** `{ "status": "conflict" }`.

### User Story 4 — Invalid input rejected cheaply (P1)

**Given** bad hostname or fingerprint, **When** check is called, **Then** `400` with a stable error shape; no DynamoDB call.

### User Story 5 — Deterministic and fast (P2)

**Given** any valid request, **When** handled, **Then** only normalize + single GetItem (+ map); never waits on network probes.

### Edge Cases

- Hostname casing / trailing dot → normalized before lookup
- Fingerprint uppercase hex → normalized to lowercase
- Oversized JSON body → reject (payload limit)
- Extra unknown JSON fields → ignore or reject? **Decision: ignore unknown fields** (forward compatible)
- Empty body / wrong Content-Type → 400

## Requirements

### Functional Requirements

- **FR-001**: System MUST expose `POST /v1/check` on the existing HTTP API.
- **FR-002**: Request MUST require `hostname` (string) and `certificateSha256` (string).
- **FR-003**: System MUST normalize inputs with `@webnotary/data-model` before DynamoDB access; normalization failures → HTTP 400.
- **FR-004**: System MUST GetItem using `hostCertKeys(hostname, certificateSha256)`.
- **FR-005**: If no item, response MUST be `{ "status": "unknown" }`.
- **FR-006**: If item exists, response status MUST follow the mapping in [contracts/status-mapping.md](./contracts/status-mapping.md).
- **FR-007**: Handler MUST NOT perform TLS, DNS, SQS send, or DynamoDB writes in 0.003.
- **FR-008**: Success responses MUST be HTTP 200 with JSON body `{ "status": "<public>" }` only (no internal status leakage).
- **FR-009**: Request body MUST be capped (e.g. 4 KiB) to bound abuse cost.
- **FR-010**: Package MUST include unit tests for validation, mapping, and handler orchestration (mocked DynamoDB).
- **FR-011**: Deploy path MUST use Terraform to add Lambda + route integration; IAM role creation is required for Lambda and is an explicit deploy prerequisite (see research).

### Key Entities

- **CheckRequest** — client-submitted hostname + fingerprint
- **CheckResponse** — public status only
- **DomainCertificateState** — read-only source of truth (0.001)

## Success Criteria

- **SC-001**: Seeded valid pair → `valid` via HTTP.
- **SC-002**: Unknown pair → `unknown` with zero writes/SQS.
- **SC-003**: Conflict pair → `conflict`.
- **SC-004**: Invalid input → 400 without DynamoDB.
- **SC-005**: Unit tests pass in CI/local without AWS.
- **SC-006**: `terraform plan` shows Lambda + `POST /v1/check` route (when IAM available).

## Assumptions

- DynamoDB table and HTTP API from 0.002 already exist in `dev`.
- Public API remains unauthenticated for ordinary lookups (per `webnotary.md` non-goals).
- Dev trust mapping may treat `SINGLE_OBSERVED` as `valid` (temporary; 0.007 owns production policy).

## Dependencies

- **Requires**: 0.001, 0.002
- **Enables**: manual milestone validation; 0.005 extends unknown path
- **Blocked by (deploy)**: ability to create/pass an IAM role for Lambda (Albert currently cannot `iam:CreateRole`)
