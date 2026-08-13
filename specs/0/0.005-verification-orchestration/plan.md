# Implementation Plan: Verification Orchestration

**Branch**: `0.005-verification-orchestration`  
**Status**: Implementing

## Components

1. **lookup-api** — after mapping to `unknown`, `tryEnqueue` + client sighting update; extend IAM
2. **verification-worker** — SQS Lambda using `@webnotary/observer`
3. **infra/observer_lambda.tf** — role, function, event source mapping; env TABLE/BUCKET/QUEUE

## Flow

```text
POST /v1/check
  → GetItem
  → mapStatus
  → record client sighting (best effort)
  → if unknown: conditional pending + SQS
  → return status immediately

SQS → worker
  → observe(hostname)
  → PutObject evidence
  → Upsert HOST#/CERT#(observed) SINGLE_OBSERVED if tlsValid
  → Delete VERIFY# pending
```
