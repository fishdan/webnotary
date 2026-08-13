# Feature Specification: Lookup API

**Feature Branch**: `0.003-lookup-api`  
**Created**: 2026-08-13  
**Status**: Stub  
**Source**: `webnotary.md` § Public API, Step 3

## Intent

Implement `POST /v1/check` as a small deterministic Lambda that queries DynamoDB and returns public trust states.

## In Scope

- Request validation for `hostname` + `certificateSha256`
- DynamoDB lookup of hostname/certificate pair
- Responses: `valid`, `unknown` (and `conflict` when evidence exists)
- Strict input length/format limits

## Out of Scope

- Live TLS probing in the request path
- Full UNKNOWN→SQS wiring (0.005)
- Trust-policy calculation beyond reading stored state (0.007)
- Chrome extension (0.008)

## Key Requirements

- Never wait on observer work
- Unknown ≠ malicious
- Keep extension protocol stable and minimal
- Constitution XXII, XXV

## User Stories (stub)

### US1 — Known valid pair (P1)

Given seeded VALID state, API returns `{ "status": "valid" }`.

### US2 — Unknown pair (P1)

Given no state, API returns `{ "status": "unknown" }` without expensive side effects (until 0.005 defines allowed side effects).

### US3 — Invalid input (P2)

Malformed hostname/fingerprint rejected cheaply.

## Dependencies

- Requires: 0.001; 0.002 for deploy
- Soft dependency: 0.005 for async verification side effects
