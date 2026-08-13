# Feature Specification: Chrome Extension

**Feature Branch**: `0.008-chrome-extension`  
**Created**: 2026-08-13  
**Status**: Stub  
**Source**: `webnotary.md` § Intended Extension Behavior, Steps 12–13

## Intent

Build a minimal Chrome extension that checks hostname/certificate pairs against WebNotary without background telemetry on every page load, after the backend pipeline works end to end.

## In Scope

- Read current hostname + presented certificate fingerprint
- Local trust cache (hostname, certificateSha256, validatedAt, notAfter)
- Call `POST /v1/check` only when not locally trusted
- Cache VALID; clearly surface UNKNOWN; strongly surface CONFLICT
- Local trust expiration (must not live forever)

## Out of Scope

- Complex observer policy UI
- Mobile browsers
- User accounts / auth for ordinary lookups
- Sending a request on every page load

## Key Requirements

- Constitution XXII, XXV
- Backend owns trust policy; extension stays simple
- Avoid background browsing telemetry

## User Stories (stub)

### US1 — Cached valid is silent (P1)

Locally trusted unexpired pair does not call API.

### US2 — First sighting checks API (P1)

Uncached pair calls `/v1/check` and handles valid/unknown/conflict.

### US3 — Expired local trust revalidates (P2)

Expired cache entry triggers a new check.

## Dependencies

- Requires backend E2E: ideally through 0.005; preferably 0.007 for safer public behavior
- Must not start as a blocker before lookup+observer pipeline works
