# Implementation Plan: TLS Observer

**Branch**: `0.004-tls-observer` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Stub

## Summary

CLI-first observer library with SSRF protections and certificate fingerprinting; later wrap for Lambda.

## Technical Context

**Language**: TypeScript preferred (align with API) unless plan justifies otherwise  
**Testing**: Unit tests mandatory for SSRF/hashing/hostname validation  
**Output**: Structured JSON observation

## Constitution Check

- [ ] XXVI no client-cert forcing
- [ ] XXIII SSRF / public-only
- [ ] VII security-sensitive tests required

## Open Questions

- Exact DER/fingerprint canonicalization
- How much chain material to retain vs fingerprint-only MVP

## Next

Full `/speckit-plan` when starting 0.004.
