# Feature Specification: CT Gate and Trust Policy

**Feature Branch**: `0.007-ct-gate-and-trust-policy`  
**Created**: 2026-08-13  
**Status**: Spec complete — awaiting decision lock, then implementation  
**Source**: `webnotary.md` § Trust States, Steps 9–10; Constitution XXI–XXIII

## Intent

1. **CT gate** — Before scheduling expensive TLS observation, require the client fingerprint to exist in certificate inventory (`CERT#…` / `META` from 0.006). Unknown-to-CT fingerprints return `unknown` with **no** SQS work.
2. **Trust policy** — Isolate the rules that map internal `DomainCertStatus` ↔ public `valid` | `unknown` | `conflict`, and the first MVP rule for raising `CONFLICT`, so the Chrome extension (0.008) never embeds policy logic.

## In Scope

- Lookup `/v1/check` unknown path: inventory GetItem before `tryEnqueue`
- Still record client sightings for CT-unknown fingerprints (evidence of client reports) — without enqueue
- When inventory hit + relationship not yet `valid`/`conflict` → existing pending dedupe + SQS enqueue
- Extract isolatable trust-policy module (package or shared module) used by lookup (and reusable by workers later)
- Document / encode **dev** rule: `SINGLE_OBSERVED` → public `valid` (temporary; not production multi-observer policy)
- MVP `CONFLICT` determination rule (see research)
- Optionally mark `HOST#`/`CERT#` as `CT_SEEN` (or `ctSeen=true`) when inventory is known but observation has not established trust — **without** granting VALID
- Unit + manual tests for gate and conflict paths

## Out of Scope

- Multi-observer consensus / `MULTI_OBSERVED` production scoring
- Changing public JSON shape of `/v1/check`
- Chrome extension (0.008)
- Replacing crt.sh or expanding CT seed lists
- New CloudWatch alarms
- Changing observer SSRF / observe mechanics

## Key Requirements

| ID | Requirement |
|----|-------------|
| R1 | Constitution XXI: CT evidence ≠ trust; inventory membership alone never yields `valid` |
| R2 | Constitution XXII: trust-policy isolatable from extension protocol |
| R3 | Constitution XXIII: abuse/cost — CT-unknown must not amplify into probes |
| R4 | Public API remains `{ "status": "valid"\|"unknown"\|"conflict" }` |
| R5 | Pending dedupe by hostname from 0.005 remains authoritative for enqueue |
| R6 | Clients still cannot elevate status to `SINGLE_OBSERVED` / `ESTABLISHED` |

## User Stories

### US1 — CT gate blocks garbage amplification (P1)

**Given** a fingerprint with no inventory row  
**When** `POST /v1/check`  
**Then** response is `unknown` and no verification message is sent (pending not created for this reason).

### US2 — CT-known unknown relationship verifies (P1)

**Given** inventory contains the fingerprint and the hostname/cert pair is not yet valid/conflict  
**When** `POST /v1/check`  
**Then** at most one verification job is scheduled (pending + SQS), response remains `unknown` until observation completes.

### US3 — Policy yields VALID (P1, dev)

**Given** an observer has written `SINGLE_OBSERVED` for the pair  
**When** client checks that fingerprint  
**Then** public status is `valid` (dev policy; documented as temporary).

### US4 — CONFLICT MVP (P1)

**Given** the MVP conflict rule (locked in research) is met  
**When** client checks  
**Then** public status is `conflict` and expensive verification is not scheduled for that request.

## Success Criteria

1. Random/garbage fingerprint → `unknown`, zero SQS send.
2. Inventory-seeded fingerprint for unverified host relationship → enqueue once.
3. Trust-policy module has tests independent of API Gateway wiring.
4. Spec/progress record that single-observer VALID is **dev-only**.

## Dependencies

- **Requires**: 0.005 (enqueue), 0.006 (inventory)
- **Consumed by**: 0.008
