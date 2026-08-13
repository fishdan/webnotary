# Tasks: CT Inventory Pipeline

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md)  
**Status**: Implementation complete (crt.sh live path blocked by upstream 502 at validation time)  
**Branch**: `0.006-ct-inventory-pipeline`

**Goal**: Independently ingest Certificate Transparency evidence into DynamoDB certificate inventory (`CERT#…` / `META`) via a crt.sh-backed job and a PEM/DER CLI — idempotently, with no hostname trust side effects — so 0.007 can gate verification on inventory membership.

---

## Phase 1: Spec & design freeze

**Purpose**: Lock MVP source, retention, and schedule before coding.

- [x] T001 Human locks research decisions D1–D7 (crt.sh + PEM CLI, no DER S3, seed list, no HOST# writes, EventBridge vs CLI-only, serial encoding, no alarms). Update [research.md](./research.md) / [notes.md](./notes.md) if any answer differs from the proposal.
- [x] T002 Finalize SpecKit (`spec.md`, `plan.md`, `research.md`, `notes.md`, `manualtester.md`, this file) so an engineer can implement without chat history.

---

## Phase 2: Package — normalize, upsert, CLI (US1 / US2 / US3 / US4)

**Purpose**: Shared library + CLI that turns CT/file input into inventory rows only.

- [x] T003 Create `packages/ct-ingest` (package.json, tsconfig, vitest, README) depending on `@webnotary/data-model` and AWS SDK DynamoDB client; expose a `webnotary-ct-ingest` CLI bin.
- [x] T004 Implement `packages/ct-ingest/src/normalize.ts` to map a parsed leaf certificate (+ CT timestamps/source) into a `CertificateInventoryItem`-shaped object: lowercase hex fingerprints, serial as lowercase hex, DNS SANs normalized like 0.001 hostnames where applicable, ISO-8601 validity windows.
- [x] T005 Implement `packages/ct-ingest/src/upsert.ts` that UpdateItem/PutItem **only** `CERT#fp` / `META` with idempotent semantics:
  - create on first see (`ctFirstSeen` = now or CT entry time)
  - on re-ingest preserve `ctFirstSeen`, advance `ctLastSeen` / `updatedAt`, refresh metadata fields
  - never call Dynamo APIs for `HOST#` / `VERIFY#` keys
- [x] T006 Implement `packages/ct-ingest/src/crtsh.ts` best-effort client: search by hostname, fetch leaf cert by id, compute fingerprints, respect `CT_MAX_CERTS_PER_HOST`, retries/timeouts; failures isolated per hostname.
- [x] T007 Implement CLI commands:
  - `webnotary-ct-ingest host <hostname>` — crt.sh path → upsert
  - `webnotary-ct-ingest file --pem|--der <path> [--ct-source <name>]` — offline path → upsert
  - Require `TABLE_NAME` (and AWS creds) for upsert; support `--dry-run` to print normalized items without writing
- [x] T008 Unit tests: normalize fixtures; upsert preserves `ctFirstSeen` and never issues HOST# writes (mock Dynamo); crt.sh client parsing with recorded fixtures (no live network in CI).
- [x] T009 `npm test` + `npm run build` in `packages/ct-ingest`.

---

## Phase 3: Scheduled worker (optional per D5)

**Purpose**: Recurring seed walk off the public API path.

- [x] T010 Implement `packages/ct-ingest/src/handler.ts` Lambda entry: read `CT_SEED_HOSTNAMES`, iterate hosts via crt.sh + upsert, log per-host success/failure, exit without failing the whole batch on a single host error (or fail only if all hosts fail — document choice in code comments / notes).
- [x] T011 Bundle with esbuild for Lambda Node 20 (same pattern as lookup/verification-worker).
- [x] T012 Add `infra/ct_ingest_lambda.tf`: IAM role (logs + DynamoDB read/write on inventory keys / table), function, EventBridge schedule (`rate(1 day)` or locked alternative), env `TABLE_NAME`, `CT_SEED_HOSTNAMES`, `CT_MAX_CERTS_PER_HOST`; outputs for function name.
- [x] T013 `terraform apply` in `dev` after build (skip this phase entirely if human chose CLI-only).

---

## Phase 4: Validation & closeout

**Purpose**: Prove inventory fills and trust state stays untouched.

- [x] T014 Manual: dry-run then live ingest for `example.com` (or locked seed); GetItem `CERT#`/`META` shows expected fields; confirm no new `HOST#` items from this run alone (see [manualtester.md](./manualtester.md)).
  - Done via **file** path (self-signed fixture). Live **crt.sh** for `example.com` returned HTTP 502 throughout validation; Lambda invoke correctly failed all-hosts.
- [x] T015 Re-run same ingest; confirm single item, `ctFirstSeen` stable, `ctLastSeen` newer.
- [x] T016 Update `.config/ai/progress.ai` with source choice, what shipped, and “CT ≠ trust / no HOST# writes” confirmation.
- [ ] T017 Open PR to `main` when requested.

---

## Notes for humans reading this later

| Concern | Behavior |
|---------|----------|
| Does CT make a hostname VALID? | No. Inventory only. |
| Does this change `/v1/check`? | No — gating is 0.007. |
| Where do rows live? | DynamoDB `pk=CERT#<sha256>`, `sk=META`. |
| Why crt.sh? | Cheapest MVP membership source; replaceable behind a client interface. |
| DER in S3? | Not in MVP. |
| How to demo without network CT? | `webnotary-ct-ingest file --pem …`. |
| crt.sh down? | CLI file path still works; scheduled Lambda fails only if **all** seeds fail. |
