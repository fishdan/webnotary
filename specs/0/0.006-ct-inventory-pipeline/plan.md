# Implementation Plan: CT Inventory Pipeline

**Branch**: `0.006-ct-inventory-pipeline` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Ready for decision lock → implementation

## Summary

Add a standalone `@webnotary/ct-ingest` package that (1) fetches CT rows for seed hostnames via crt.sh, (2) normalizes leaf cert metadata into `CertificateInventoryItem`, and (3) idempotently upserts DynamoDB inventory rows — never touching domain-cert trust state. Ship a CLI first; wire an EventBridge-scheduled Lambda for recurring seed walks.

## Technical Context

| Area | Choice |
|------|--------|
| Language | TypeScript (Node 20), same as other packages |
| Storage | Existing DynamoDB table (`CERT#` / `META` only) |
| Compute | CLI always; optional scheduled Lambda |
| External | crt.sh JSON search + per-cert DER download for fingerprinting |
| DER retention | **None in MVP** — compute hashes in memory, discard DER |
| Coupling | No changes to `/v1/check` request path in this feature |

## Constitution Check

- [x] XXI — CT ≠ trust (inventory only; no HOST# writes)
- [x] XXIV — separate collection from serving (own package + schedule)
- [x] Minimal infra — reuse table; one optional Lambda + EventBridge rule
- [x] No alerts required (consistent with 0.002)

## Architecture (logical)

```text
seed hostnames (env / config)
        │
        v
  crt.sh search (JSON)
        │
        v
  fetch leaf DER by cert id → parse → fingerprints + SANs
        │
        v
  upsert CERT#fp / META  (idempotent)
        │
        x  —— never ——>  HOST# / trust status
```

Alternate path: `webnotary-ct-ingest file --pem leaf.pem` skips crt.sh.

## Work Packages

1. **SpecKit freeze** — this directory (done at decision lock)
2. **Package** — normalize, crt.sh client, Dynamo upsert, CLI, tests
3. **Infra** — `infra/ct_ingest_lambda.tf` (role, function, EventBridge, seed env)
4. **Validate** — unit tests + manual ingest of `example.com` + confirm no HOST# side effects

## Risks / Mitigations

| Risk | Mitigation |
|------|------------|
| crt.sh undocumented / flaky | Treat as best-effort; retries with backoff; CLI PEM path for demos; document swap-out later |
| Large SAN / cert fan-out per hostname | Cap certs processed per hostname per run (config) |
| Accidental trust writes | Persist module only calls inventory Put/Update; tests assert no HOST# API calls |

## Next

Human locks open questions in [research.md](./research.md), then execute [tasks.md](./tasks.md).
