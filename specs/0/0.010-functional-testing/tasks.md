# Tasks: Functional Testing (Top Sites Report)

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md)  
**Status**: Complete  
**Branch**: `0.010-functional-testing`

**Goal**: Observe TLS certs for a curated top-25 site list, ask `https://api.webnotary.org/v1/check` for each hostname+fingerprint, and write Markdown+JSON reports — without deleting any AWS resources.

---

## Phase 1: Spec freeze

- [x] T001 Rewrite SpecKit for observe → check → report flow (replacing fixture-only matrix as primary goal).
- [x] T002 Lock curated top-25 list approach and report semantics (`tlsValid` vs API `valid`).

---

## Phase 2: Runner

- [x] T003 Create `packages/functional-tests` depending on `@webnotary/observer`; add curated `TOP_25_SITES` list.
- [x] T004 Implement check client + run loop (observe, POST check, collect row; concurrency ≤ 3; continue on per-site errors).
- [x] T005 Implement Markdown + JSON report writers with summary counts (`valid`/`unknown`/`conflict`/observe_error/api_error).
- [x] T006 CLI `webnotary-functional-test` with `--out-dir` and `WEBNOTARY_CHECK_URL`; gitignore `reports/`.
- [x] T007 README with how to run and how to read the report.

---

## Phase 3: Execute & closeout

- [x] T008 Run against production public API; 25/25 observe+check OK; summary all `api_unknown` (cold trust — expected).
- [x] T009 Update `manualtester.md`, `notes.md`, `specs/0/README.md`, `.config/ai/progress.ai`.
- [ ] T010 Open PR when requested.

---

## Notes for humans

| Concern | Behavior |
|---------|----------|
| Mostly `unknown`? | Expected until CT+observer trust exists for those hosts. |
| PKI vs WebNotary | Report shows both `observeTlsValid` and API `status`. |
| Top 25 source | Curated static list in repo, not live Alexa scrape. |
