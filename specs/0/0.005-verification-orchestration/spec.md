# Feature Specification: Verification Orchestration

**Feature Branch**: `0.005-verification-orchestration`  
**Created**: 2026-08-13  
**Status**: Implementing  
**Source**: `webnotary.md` Steps 5–7; Constitution XXI, XXIII, XXV  
**Depends on**: 0.001–0.004

## Intent

When `/v1/check` returns public `unknown`, asynchronously schedule **at most one** independent TLS observation per hostname (pending dedupe + SQS), without blocking the client. The observer worker records evidence in S3 and updates DynamoDB current state. Clients never create trust.

## In Scope

- On `unknown`: conditional `VERIFY#` pending create + one SQS message
- Immediate `unknown` HTTP response (only awaits cheap DDB/SQS, never live TLS)
- Best-effort client sighting counters (no trust elevation)
- Observer Lambda on SQS: `observe(hostname)` → S3 evidence → DynamoDB state → clear pending
- Interim enqueue policy **without CT gate**: any validated unknown pair may enqueue by hostname (deduped)
- Terraform: extend lookup IAM; add observer role/function/event source mapping
- Baseline: existing API throttle, pending TTL 900s, SQS maxReceiveCount 3, observer SSRF

## Out of Scope

- CT inventory gate (0.006/0.007)
- Multi-observer consensus / signing
- Alerts/budgets
- Chrome extension

## Interim enqueue policy

Until CT gate exists: enqueue verification when public mapped status is `unknown`. Amplification bound = **one probe per hostname** while pending (not per fingerprint). Garbage fingerprints for the same host share one pending lock.

## Requirements (summary)

- FR: enqueue only on unknown; never on valid/conflict
- FR: pending create uses `attribute_not_exists(pk)`
- FR: SQS body includes hostname + optional requestedCertificateSha256 (untrusted)
- FR: observer writes S3 JSON under `observations/year=.../month=.../day=.../hour=.../`
- FR: on tlsValid observation, upsert DomainCertificateState for **observed** fingerprint with `SINGLE_OBSERVED`
- FR: client sightings must not set trust statuses
- FR: delete pending on terminal worker completion
