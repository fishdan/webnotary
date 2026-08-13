# Feature Specification: Acquire Mode Toggle

**Feature Branch**: `0.010-functional-testing` (ships with functional-test work) / logical id `0.011-acquire-mode`  
**Created**: 2026-08-13  
**Status**: Active

## Intent

Add env toggle `ACQUIRE_MODE=true` on the lookup Lambda. When enabled, `/v1/check` for **unknown** pairs performs a **time-bounded independent TLS observe** (default 5s) and returns `valid` / `conflict` / `unknown` based on that observation—bypassing the CT inventory gate for this sync path.

When `ACQUIRE_MODE` is unset/false, behavior remains 0.007 (CT gate + async enqueue only).

## In Scope

- `ACQUIRE_MODE` and `ACQUIRE_TIMEOUT_MS` (default 5000) env vars
- Sync observe + persist `SINGLE_OBSERVED` for the **observed** cert when `tlsValid` within timeout
- Return `valid` if observed FP matches client FP; `conflict` if tlsValid but FP differs; `unknown` on timeout/failure
- On timeout/failure in acquire mode: still best-effort async enqueue **without** CT gate (so background can finish)
- Lookup Lambda timeout/memory bump to allow ~5s observe
- Unit tests for acquire decision wiring

## Out of Scope

- Changing public JSON shape
- Disabling sibling CONFLICT pre-check
- Clients creating trust without server observe

## Success Criteria

1. `ACQUIRE_MODE=false`: cold FP still `unknown`, no sync observe.
2. `ACQUIRE_MODE=true`: cold host+FP that matches live cert can return `valid` within ~5s.
3. Terraform apply does not destroy existing resources.
