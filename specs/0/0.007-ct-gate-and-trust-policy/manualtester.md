# Manual Tester: CT Gate and Trust Policy

**Status**: Active with SpecKit  
**Branch**: `0.007-ct-gate-and-trust-policy`  
**Check URL**: `https://5jdix54pag.execute-api.us-east-1.amazonaws.com/v1/check`

## Prerequisites

- Inventory can be seeded via `webnotary-ct-ingest file --pem …` (0.006)
- Observer path from 0.005 still healthy

## Cases

### M1 — Garbage fingerprint (US1)

1. `POST /v1/check` with a hostname that has **no** independently observed certs yet + random 64-hex FP (not in inventory).
   - Do **not** use a host like `example.com` that already has `SINGLE_OBSERVED` siblings — that hits CONFLICT (M4) first.
2. **Expect**: `{ "status": "unknown" }`.
3. **Expect**: no `VERIFY#hostname` pending created for this request.

### M2 — CT-known, unverified relationship (US2)

1. Ensure `CERT#fp`/`META` exists for fingerprint F (file ingest of a real leaf, or CT when available).
2. Use a hostname that does **not** yet have `SINGLE_OBSERVED` for F.
3. `POST /v1/check` with that hostname + F.
4. **Expect**: `unknown`, pending/SQS once (deduped on repeat).

### M3 — Dev VALID after observation (US3)

1. After observer writes `SINGLE_OBSERVED` for observed FP O.
2. `POST /v1/check` with hostname + O.
3. **Expect**: `valid`; no enqueue.

### M4 — CONFLICT sibling (US4)

1. Hostname H has `SINGLE_OBSERVED` for FP-A.
2. `POST /v1/check` with H + FP-B (B ≠ A; B may or may not be in inventory).
3. **Expect**: `conflict`; no enqueue.

### M5 — Sighting without probe

1. Repeat M1.
2. **Expect**: `HOST#`/`CERT#` client sighting fields may update with `UNKNOWN`, but still no verification work.
