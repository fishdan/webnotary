# Implementation Plan: Lookup API

**Branch**: `0.003-lookup-api` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Specified (awaiting review)

## Summary

Ship a TypeScript `POST /v1/check` Lambda that validates input, GetItems DynamoDB, maps internal status → public `valid|unknown|conflict`, and integrates with the existing HTTP API. No probe/SQS/writes. IAM role deploy is an open prerequisite.

## Technical Context

**Language**: TypeScript (Node 20)  
**Package**: `packages/lookup-api`  
**Depends on**: `@webnotary/data-model`  
**AWS**: Lambda + API Gateway route on 0.002 API; DynamoDB table from 0.002  
**Testing**: Vitest with mocked DynamoDB client  
**Constraints**: Constitution XXI/XXII/XXV — no client trust, no live probe on path

## Constitution Check

| Gate | Status |
|------|--------|
| XXII Public statuses | Pass — contract locked |
| XXV No live probe on path | Pass |
| XXI Client cannot create trust | Pass — read-only |
| XXIII Cheap reject of garbage | Pass — validate before DDB |
| XVI Least privilege IAM | When role is created — matrix from 0.002 |

## Project Structure

```text
specs/0/0.003-lookup-api/
  spec.md plan.md research.md tasks.md notes.md manualtester.md
  contracts/check-api.md
  contracts/status-mapping.md

packages/lookup-api/
  package.json tsconfig.json vitest.config.ts
  src/
    handler.ts
    mapStatus.ts
    dynamo.ts
    index.ts
  tests/
    mapStatus.test.ts
    handler.test.ts

infra/   # extend existing stack
  lookup_lambda.tf   # function + permission + route (IAM role resource or ARN var)
```

## Implementation Approach (post-review)

1. Lock contracts (done in SpecKit).
2. Implement `mapStatus` + handler + tests.
3. Add Terraform for Lambda + `POST /v1/check`.
4. Resolve IAM open question; apply when possible.
5. Manual test with seeded DynamoDB item.

## Open items for reviewer

See [research.md](./research.md) — especially IAM option 1 / 2 / 3.
