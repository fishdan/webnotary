# Tasks: Operational Data Model

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md)  
**Status**: Implementation complete (pending human review / merge)

## Phase 1: Design freeze

- [x] T001 Author `data-model.md` with keys, attributes, enums, access patterns
- [x] T002 Record research decisions in `research.md`
- [x] T003 Flesh out `spec.md` / `plan.md` acceptance criteria

## Phase 2: Shared library

- [x] T004 Create `packages/data-model` with package.json, tsconfig, vitest
- [x] T005 [P] Implement `src/types.ts` entity types and status enum
- [x] T006 [P] Implement `src/normalize.ts` hostname + fingerprint normalization
- [x] T007 Implement `src/keys.ts` builders for HOST/CERT, CERT/META, VERIFY/PENDING
- [x] T008 Export public API from `src/index.ts`

## Phase 3: Tests

- [x] T009 [P] Unit tests for hostname normalization (case, trailing dot, reject IP/empty/long)
- [x] T010 [P] Unit tests for fingerprint normalization (case, length, non-hex)
- [x] T011 Unit tests for key builders matching `data-model.md`
- [x] T012 Run vitest and ensure all tests pass (14/14)

## Phase 4: Closeout

- [x] T013 Update `manualtester.md` with any final library usage notes
- [x] T014 Update `.config/ai/progress.ai` with completion notes
- [x] T015 Mark tasks complete; prepare PR to `main` when human requests
