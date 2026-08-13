# Implementation Plan: Chrome Extension

**Branch**: `0.008-chrome-extension` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Stub

## Summary

MV3 Chrome extension with local trust cache and minimal WebNotary client for `/v1/check`.

## Technical Context

**Platform**: Chrome extension (Manifest V3)  
**API**: `POST /v1/check`  
**Constraints**: No per-pageload telemetry; cache expiration required

## Constitution Check

- [ ] XXII simple client protocol
- [ ] XXV no background telemetry / finite local trust

## Open Questions

- How extension obtains cert fingerprint in modern Chrome APIs
- UX for UNKNOWN vs CONFLICT

## Next

Full `/speckit-plan` only after backend E2E works.
