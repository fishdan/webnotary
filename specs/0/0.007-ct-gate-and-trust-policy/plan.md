# Implementation Plan: CT Gate and Trust Policy

**Branch**: `0.007-ct-gate-and-trust-policy` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Ready for decision lock → implementation

## Summary

Gate verification enqueue on CT inventory membership; extract an isolatable trust-policy module for public status mapping and MVP CONFLICT; optionally stamp `CT_SEEN` on domain-cert rows when inventory is known. Do not change `/v1/check` response shape.

## Technical Context

| Area | Choice |
|------|--------|
| Gate check | DynamoDB GetItem `CERT#fp` / `META` in lookup Lambda |
| Policy home | New `packages/trust-policy` (preferred) consumed by `lookup-api` |
| Enqueue | Existing `tryEnqueue` — call only when gate allows |
| CONFLICT | Per locked research rule (query siblings vs worker-only) |
| Infra | No new resources expected; lookup already has table R/W |

## Constitution Check

- [x] XXI — CT alone ≠ valid
- [x] XXII — policy package separate from extension
- [x] XXIII — CT-unknown does not enqueue probes

## Flow (lookup)

```text
normalize hostname + fp
  → GetItem HOST#/CERT#  → mapStatus (policy)
  → record client sighting (best-effort)
  → if public status is unknown:
        GetItem CERT#/META
        if missing → stop (no enqueue)
        if present → tryEnqueue (pending + SQS)
  → return { status }
```

## Work Packages

1. SpecKit freeze (this directory)
2. `packages/trust-policy` — `toPublicStatus`, CONFLICT helper, tests
3. Lookup wiring — inventory store + gate; adopt policy package; update handler tests
4. Optional CT_SEEN stamp on domain-cert when inventory hit
5. Manual E2E against live API + inventory row from 0.006 file ingest / observer path

## Next

Human locks [research.md](./research.md) open questions, then [tasks.md](./tasks.md).
