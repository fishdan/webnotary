# Tasks: CT Gate and Trust Policy

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md)  
**Status**: Implementation complete  
**Branch**: `0.007-ct-gate-and-trust-policy`

**Goal**: Stop verification fan-out for fingerprints unknown to CT inventory; isolate trust→public mapping (and MVP CONFLICT) in a reusable policy module so `/v1/check` stays cheap, abuse-resistant, and extension-agnostic — without changing the public response shape.

---

## Phase 1: Spec & design freeze

**Purpose**: Lock gate, CONFLICT, and package boundaries before coding.

- [x] T001 Human locks research D1–D6 (inventory gate, trust-policy package, CONFLICT sibling rule, CT_SEEN stamp, no new infra, rotation caveat). Update [notes.md](./notes.md) when locked.
- [x] T002 Finalize SpecKit in this directory so implementation does not need chat history.

---

## Phase 2: Trust-policy module (US3 / US4)

**Purpose**: Isolatable rules with unit tests, no API Gateway types.

- [x] T003 Create `packages/trust-policy` (package.json, tsconfig, vitest, README) depending on `@webnotary/data-model` only.
- [x] T004 Implement `toPublicStatus(stored)` equivalent to current lookup `mapStatus`, with an explicit README note that `SINGLE_OBSERVED → valid` is **dev policy**.
- [x] T005 Implement `shouldEnqueueVerification({ publicStatus, inventoryKnown })` → true only when `publicStatus === "unknown"` **and** `inventoryKnown === true`.
- [x] T006 Implement `detectConflictFromSiblings({ clientCertificateSha256, siblings })` (or equivalent) encoding the locked CONFLICT MVP rule; return whether the check should be treated as conflict.
- [x] T007 Unit-test public mapping, enqueue gate matrix, and sibling CONFLICT cases (`npm test` in `packages/trust-policy`).

---

## Phase 3: Lookup API wiring (US1 / US2 / US4)

**Purpose**: Enforce CT gate and CONFLICT on the live check path.

- [x] T008 Add inventory lookup helper in `packages/lookup-api` (GetItem `CERT#`/`META` via `certInventoryKeys`) — read-only membership boolean.
- [x] T009 Extend domain-cert store (or sibling helper) to Query `pk=HOST#hostname` for CONFLICT sibling scan; keep projection minimal (`sk`, `status`, `certificateSha256`).
- [x] T010 Update `handleCheck` to: map status via trust-policy; if not already conflict/valid, run sibling CONFLICT detection; record sightings; enqueue only when `shouldEnqueueVerification` says so; optionally stamp `CT_SEEN` when inventory known (per lock) without elevating trust.
- [x] T011 Point `mapStatus` at trust-policy (re-export or delete duplicate); add `@webnotary/trust-policy` dependency; rebuild lookup bundle.
- [x] T012 Update `packages/lookup-api` tests: CT-unknown → no enqueue; CT-known unknown → enqueue; sibling observed different FP → conflict + no enqueue; valid/conflict unchanged.

---

## Phase 4: Deploy & validate

**Purpose**: Prove gate behavior on the deployed API.

- [x] T013 Rebuild lookup Lambda + `terraform apply` (added `dynamodb:Query` on lookup role; code hash update).
- [x] T014 Manual: garbage FP on clean hostname → `unknown`, no pending.
- [x] T015 Manual: inventory row + clean hostname → `unknown`, pending created, `CT_SEEN` stamped.
- [x] T016 Manual: host with `SINGLE_OBSERVED` for FP-A; check FP-B → `conflict`; observed FP → `valid`.
- [x] T017 Update `.config/ai/progress.ai`; open PR when requested.

---

## Notes for humans reading this later

| Concern | Behavior |
|---------|----------|
| Random FP probe amplification? | Blocked — no inventory ⇒ no enqueue. |
| Does inventory alone return valid? | No — still `unknown` until observation (dev: then `SINGLE_OBSERVED`→valid). |
| Where is policy code? | `packages/trust-policy` — not in the extension. |
| Cert rotation? | May show `conflict` until policy/observers catch up (MVP caveat). |
| Public API change? | None. |
| Check on host with existing observed cert + other FP? | `conflict` (sibling rule) — not `unknown`. |
