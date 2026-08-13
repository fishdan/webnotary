# Tasks: Lookup API

**Status**: Implementation complete (ready for PR when requested)

## Phase 0: SpecKit

- [x] T000a–T000c SpecKit + contracts
- [x] T000d IAM unlocked (`IAMFullAccess` + Lambda full access on Albert)

## Phase 1: Handler library

- [x] T001 Scaffold `packages/lookup-api`
- [x] T002 `mapStatus`
- [x] T003 DynamoDB GetItem adapter
- [x] T004 Lambda handler
- [x] T005 Unit tests
- [x] T006 `npm test` green (9/9)

## Phase 2: Deploy wiring

- [x] T007–T009 Terraform Lambda + IAM role + `POST /v1/check`
- [x] T010 Applied; smoke tests: unknown/valid/conflict/400
- [x] T011 progress.ai
