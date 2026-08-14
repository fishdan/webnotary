# Tasks: Path-Mismatch Conflict Severity

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)  
**Status**: Implementing  
**Branch**: `0.012-path-mismatch-severity`

**Goal**: Conflicts remain fingerprint mismatches, but API + extension classify and present them as path-vs-public-observation with calm (`info`) vs elevated (`attention`) severity — without scaring users on multi-cert hosts.

---

## Phase 1: Policy

**Purpose**: Isolatable severity rules with tests.

- [x] T001 Add `classifyConflictSeverity` + `conflictSummary` in `packages/trust-policy` with vitest coverage for info vs attention.

---

## Phase 2: Lookup API

**Purpose**: Enrich conflict responses; deploy without destroys.

- [x] T002 Extend `ConflictDetail` in `packages/lookup-api/src/response.ts`.
- [x] T003 Handler: count observed siblings, inventory-check client FP on conflict, attach severity/signals/summary; update handler tests + `check-api.md`.
- [x] T004 Build + terraform apply lookup Lambda only (0 destroy).

---

## Phase 3: Extension

**Purpose**: User-facing path-mismatch story.

- [x] T005 Parse severity in `lib/check.js`; situation-signature upsert + severity-aware notify in conflicts/background.
- [x] T006 Popup / options / conflict pages: PKI + path-mismatch copy; soft treatment for `info`.

---

## Notes for humans

| Behavior | Detail |
|----------|--------|
| Top-level status | Still `conflict` |
| Sticky notify | `attention` (and later `alert`) only |
| Multi-cert heuristic | `observedLeafCount >= 2` → `info` |
| CT heuristic | Client leaf in inventory → `info` |
