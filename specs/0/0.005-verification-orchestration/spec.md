# Feature Specification: Verification Orchestration

**Feature Branch**: `0.005-verification-orchestration`  
**Created**: 2026-08-13  
**Status**: Stub  
**Source**: `webnotary.md` § Unknown Certificate Flow, Steps 5–7

## Intent

Connect UNKNOWN lookups to asynchronous independent verification with hostname deduplication and baseline abuse controls — without blocking the browser.

## In Scope

- Preserve client-sighting info without treating it as trust
- Conditional pending verification create
- Enqueue at most one verification job per hostname while pending
- SQS → Observer Lambda → DynamoDB current state + S3 raw evidence
- Baseline throttling, TTL, concurrency, DLQ/retry, SSRF already in observer
- Immediate `unknown` response to client

## Out of Scope

- CT gate (0.006/0.007) — until then, document interim enqueue policy carefully
- Final production multi-observer consensus
- Chrome extension

## Key Requirements

- Amplification ≈ 1 for garbage inputs (tighten further with CT gate later)
- Client never creates trust
- Constitution XXI, XXIII, XXV

## User Stories (stub)

### US1 — First unknown enqueues once (P1)

First unknown for hostname creates pending + one SQS message; API still returns unknown immediately.

### US2 — Duplicate unknowns do not fan out (P1)

Concurrent duplicates do not create N probes.

### US3 — Observation updates state + evidence (P1)

Successful observer run writes summarized state and immutable S3 evidence.

## Dependencies

- Requires: 0.001–0.004
- Softened later by: 0.006–0.007
