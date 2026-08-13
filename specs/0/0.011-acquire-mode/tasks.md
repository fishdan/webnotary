# Tasks: Acquire Mode

**Branch**: `0.010-functional-testing`  
**Goal**: Toggle sync acquisition of unknown checks within ~5s when `ACQUIRE_MODE=true`.  
**Status**: Complete (deployed to dev)

- [x] T001 Extend `shouldEnqueueVerification` with `acquireMode` (bypasses inventory requirement when true + unknown)
- [x] T002 Add lookup `acquire.ts` + Dynamo upsert for observed cert; race observe vs timeout
- [x] T003 Wire handler; Terraform `ACQUIRE_MODE`/`ACQUIRE_TIMEOUT_MS`; Lambda timeout ≥ 15s
- [x] T004 Unit tests; deploy (0 destroys); smoke cold hostname acquire → valid (`cloudflare.com`)
