# Feature Specification: CT Gate and Trust Policy

**Feature Branch**: `0.007-ct-gate-and-trust-policy`  
**Created**: 2026-08-13  
**Status**: Stub  
**Source**: `webnotary.md` § Trust States, Steps 9–10

## Intent

Use CT inventory as a gate before expensive verification, and isolate explicit rules that move domain/certificate pairs through internal trust states into public `valid` / `unknown` / `conflict`.

## In Scope

- If fingerprint unknown to CT inventory → return UNKNOWN with no expensive verification work
- If CT-known but hostname relationship unestablished → dedupe + queue verification
- First explicit trust-state progression rules (dev policy may be single-observer)
- Keep trust-policy module isolatable from extension protocol

## Out of Scope

- Final production multi-observer consensus scoring
- Extension UI (0.008)
- Changing public API shape

## Key Requirements

- Constitution XXI–XXIII
- Internal progression may be richer than public API
- Dev: CT known + one successful independent observation may suffice to test VALID flow — not final production policy

## User Stories (stub)

### US1 — CT gate blocks garbage amplification (P1)

Totally unknown fingerprint → unknown, zero probe fan-out.

### US2 — CT-known unknown relationship verifies (P1)

CT-known cert for unchecked hostname relationship → at most one verification job.

### US3 — Policy yields VALID/CONFLICT (P1)

Isolated policy maps evidence to public statuses without extension changes.

## Dependencies

- Requires: 0.005, 0.006
- Consumed by: 0.008
