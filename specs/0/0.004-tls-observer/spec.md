# Feature Specification: TLS Observer

**Feature Branch**: `0.004-tls-observer`  
**Created**: 2026-08-13  
**Status**: Stub  
**Source**: `webnotary.md` § Observer Behavior, Steps 4–5

## Intent

Build a standalone TLS observer that, given a hostname, independently records what certificate that host presents — first as a local CLI, then packaged for Lambda.

## In Scope

- Hostname syntax validation
- DNS resolution + public-destination / SSRF protections + rebinding defense
- TCP :443, TLS with SNI, capture chain, PKI validation
- SHA-256 leaf + SPKI fingerprints
- Structured observation output
- Tests for validation, hashing, blocked destinations
- Later: Lambda packaging of the same component

## Out of Scope

- Trust decisions / writing VALID state (0.005/0.007)
- Multi-observer signing network (later release)
- Forcing server to present client-reported cert (forbidden)

## Key Requirements

- Constitution XXVI observer integrity
- Observer records what *it* sees; client fingerprint is never authoritative
- Port 443 only for initial build

## User Stories (stub)

### US1 — Observe public HTTPS host (P1)

`webnotary-observer accounts.google.com` emits structured observation with fingerprints.

### US2 — Reject dangerous destinations (P1)

Private/loopback/metadata/etc. destinations are refused without connecting.

### US3 — Lambda-ready package (P2)

Same logic runnable as SQS-triggered worker input handler.

## Dependencies

- Soft: 0.002 for deploy; 0.005 for queue wiring
- Can start locally before AWS foundation is complete
