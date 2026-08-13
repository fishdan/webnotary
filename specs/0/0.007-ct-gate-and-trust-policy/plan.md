# Implementation Plan: CT Gate and Trust Policy

**Branch**: `0.007-ct-gate-and-trust-policy` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Stub

## Summary

Modify unknown handling to consult CT inventory before enqueue; implement isolatable trust-policy module for state transitions and public status mapping.

## Technical Context

**Touch points**: Lookup Lambda unknown path; observer completion handler; policy module  
**Constraints**: Do not break `/v1/check` response contract

## Constitution Check

- [ ] XXI–XXIII
- [ ] XXII policy isolatable from extension protocol

## Open Questions

- Exact internal enum vs public status mapping
- When CONFLICT is raised for MVP

## Next

Full `/speckit-plan` when starting 0.007.
