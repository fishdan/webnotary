# Research: Lookup API

**Feature**: 0.003-lookup-api  
**Date**: 2026-08-13

## Decision: Read-only in 0.003

**Choice**: GetItem only; no client-sighting writes; no SQS.

**Rationale**: Matches `webnotary.md` Step 3 milestone; keeps handler deterministic; 0.005 owns unknown→verify side effects.

## Decision: Static status mapping table in-repo

**Choice**: Document mapping in `contracts/status-mapping.md`; implement as pure function.

**Rationale**: Isolates policy for 0.007; extension protocol stays stable.

## Decision: Reuse `@webnotary/data-model`

**Choice**: Normalization + key builders from 0.001 package.

## Decision: API Gateway HTTP API + Lambda proxy

**Choice**: Add `POST /v1/check` route → lookup Lambda on existing 0.002 HTTP API.

## IAM decision (locked)

**Choice**: Option 1 — Albert now has `IAMFullAccess` and `AWSLambdaFullAccess` / `AWSLambda_FullAccess`, so Terraform may create the lookup execution role and Lambda in 0.003.


## Decision: Ignore unknown JSON fields

**Choice**: Accept extra properties; only require the two known fields.

**Rationale**: Forward compatibility for clients.
