# Implementation Plan: Lookup API

**Branch**: `0.003-lookup-api` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Stub

## Summary

TypeScript Lambda behind API Gateway HTTP API implementing `POST /v1/check`.

## Technical Context

**Language**: TypeScript (per webnotary.md)  
**Compute**: AWS Lambda  
**Storage**: DynamoDB  
**Testing**: Unit tests for validation + lookup mapping; contract tests for response shape

## Constitution Check

- [ ] XXII public statuses only
- [ ] XXV no live probe on request path
- [ ] XXIII cheap rejection of garbage input

## Open Questions

- Exact fingerprint encoding (hex/base64) and normalization
- Hostname normalization (case, trailing dot, IDNA)

## Next

Full `/speckit-plan` when starting 0.003.
