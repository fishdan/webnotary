# Tasks: Verification Orchestration

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md)  
**Status**: Complete  
**Branch**: `0.005-verification-orchestration`

**Goal**: When `/v1/check` returns `unknown`, schedule at most one async TLS observation per hostname (pending lock + SQS), return immediately to the client, then have a worker observe the host, store S3 evidence, and update DynamoDB — without ever letting a client create trust.

---

## Phase 1: Spec & design freeze

**Purpose**: Lock behavior before coding so implementers know what “done” means.

- [x] T001 Write the feature SpecKit (`spec.md`, `plan.md`, `research.md`, `notes.md`, `manualtester.md`) covering:
  - unknown → enqueue path
  - pending dedupe by hostname
  - interim policy without CT gate
  - observer → S3 + DynamoDB + clear pending
  - explicit non-goals (CT gate, multi-observer, alerts, extension)

---

## Phase 2: Lookup API — client sightings & enqueue (US1 / US2)

**Purpose**: Extend the existing check Lambda so unknown results trigger verification work without blocking on TLS, and duplicates do not fan out.

- [x] T002 In `packages/lookup-api/src/dynamo.ts`, add a **client sighting recorder** that UpdateItem’s `HOST#`/`CERT#` counters (`firstClientSeen`, `lastClientSeen`, `clientSeenCount`) and may create an item with `status=UNKNOWN` via `if_not_exists` — never elevating to `SINGLE_OBSERVED` / `ESTABLISHED`.
- [x] T003 In `packages/lookup-api/src/dynamo.ts`, add a **verification scheduler** that:
  1. Conditionally PutItem `VERIFY#<hostname>` / `PENDING` with `attribute_not_exists(pk)` and TTL `expiresAt`
  2. On success only, SendMessage to the verify SQS queue with `{ hostname, requestedCertificateSha256 }`
  3. On ConditionalCheckFailed, no-ops (dedupe)
  4. If SQS send fails after pending create, deletes the pending lock so a later request can retry
- [x] T004 Update `packages/lookup-api/src/handler.ts` so that after mapping public status:
  - always best-effort records a client sighting
  - if status is `unknown`, best-effort calls `tryEnqueue`
  - if status is `valid` or `conflict`, does **not** enqueue
  - still returns the JSON status immediately (never waits on observer TLS)
- [x] T005 Add/adjust unit tests in `packages/lookup-api/tests/handler.test.ts` for: enqueue on unknown, no enqueue on valid/conflict, still return unknown if enqueue throws.
- [x] T006 Add `@aws-sdk/client-sqs` dependency and rebuild the lookup bundle (`npm test` + `npm run build` in `packages/lookup-api`).

---

## Phase 3: Verification worker — observe & persist (US3)

**Purpose**: Consume SQS jobs, independently observe the hostname, store immutable evidence, update current trust state for the **observed** cert, then clear the pending lock.

- [x] T007 Create `packages/verification-worker` (package.json, tsconfig, vitest, README) depending on `@webnotary/observer` and `@webnotary/data-model`.
- [x] T008 Implement `packages/verification-worker/src/persist.ts` to:
  - build partitioned S3 keys `observations/year=/month=/day=/hour=/...json`
  - PutObject the full observation (+ requested fingerprint audit fields)
  - if `tlsValid`, upsert DomainCertificateState for the **observed** fingerprint to `SINGLE_OBSERVED` (preserving client fields via UpdateItem)
  - always DeleteItem the `VERIFY#` pending record when the worker finishes that message
- [x] T009 Implement `packages/verification-worker/src/handler.ts` SQS handler that parses `{ hostname, requestedCertificateSha256? }`, calls `observe(hostname)`, then `persistObservation`.
- [x] T010 Unit-test persist behavior (tlsValid writes trust; tlsValid=false skips trust upsert but still clears pending) in `packages/verification-worker/tests/persist.test.ts`.
- [x] T011 Bundle the worker with esbuild (`npm test` + `npm run build` in `packages/verification-worker`).

---

## Phase 4: Infrastructure wiring

**Purpose**: Deploy the worker and grant the lookup Lambda permission to schedule work.

- [x] T012 Update `infra/lookup_lambda.tf` so the lookup role can Get/Put/Update/Delete on the WebNotary table and SendMessage to the verify queue; set env `VERIFY_QUEUE_URL` (and keep `TABLE_NAME`).
- [x] T013 Add `infra/observer_lambda.tf` creating:
  - IAM role/policy for the observer (logs, SQS consume, DynamoDB read/write/delete, S3 PutObject)
  - Lambda `webnotary-dev-observer` (Node 20, ~55s timeout) from the worker bundle
  - SQS event source mapping (batch size 1) from the verify queue
  - outputs for observer function/role names
- [x] T014 Rebuild Lambdas and `terraform apply` so lookup code/policy and observer stack are live in `dev`.

---

## Phase 5: End-to-end validation & closeout

**Purpose**: Prove the full async path and leave a record for the next engineer.

- [x] T015 Manual E2E: POST `/v1/check` with a random unknown fingerprint for a real hostname → receive `unknown` immediately → worker writes S3 evidence → POST `/v1/check` with the **observed** fingerprint → receive `valid`. Confirm pending dedupe (second unknown does not create unbounded work).
- [x] T016 Update `.config/ai/progress.ai` with what shipped, E2E results, and the interim “no CT gate yet” note.
- [x] T017 Open PR to `main` when requested.

---

## Notes for humans reading this later

| Concern | Behavior |
|---------|----------|
| Does the browser wait for TLS? | No. Only cheap DynamoDB/SQS. |
| Can clients mark a cert trusted? | No. Only the observer upserts `SINGLE_OBSERVED`. |
| What if two unknowns hit at once? | One pending wins; the other skips enqueue. |
| What about CT gating? | Not in this feature — see 0.006 / 0.007. |
| Where is evidence? | S3 evidence bucket under `observations/year=.../...` |
