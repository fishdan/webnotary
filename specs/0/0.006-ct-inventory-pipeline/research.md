# Research: CT Inventory Pipeline

## Decision D1 — MVP CT source: crt.sh (proposed)

**Options considered**

| Option | Pros | Cons |
|--------|------|------|
| A. crt.sh JSON + DER by id | Zero account cost; hostname search; enough fields for inventory | Undocumented JSON API; rate limits; third-party dependency |
| B. Direct RFC6962 log clients | Authoritative; no aggregator | Heavy ops; many logs; not MVP-sized |
| C. certstream websocket | Real-time | Persistent connection; poor fit for short Lambda; third-party stream |
| D. PEM/CLI only | Simplest tests | Does not prove CT collection path |

**Proposal**: **A + D** — crt.sh for scheduled/seed ingest; PEM/DER CLI for tests and demos.  
`ctSource` values: `crt.sh` for live fetch; `file` (or operator-supplied string) for offline ingest.

**Swap-out**: Keep fetch behind a small `CtSource` interface so a future log-tailer can replace crt.sh without changing upsert logic.

---

## Decision D2 — DER retention: none in MVP (proposed)

Compute `certificateSha256` / `spkiSha256` from leaf DER in memory; do **not** write `derS3Key` or PutObject cert blobs.

**Rationale**: Inventory membership for 0.007 gate only needs fingerprints + metadata; S3 retention can wait until audit/forensics demand it.

---

## Decision D3 — Hostname seed list, not Internet-wide scan (proposed)

MVP ingest walks a small configured list (e.g. `example.com`, plus any hosts useful for demos). Env var `CT_SEED_HOSTNAMES` as comma-separated list on the Lambda; CLI accepts `--hostname`.

**Rationale**: Constitution abuse/cost controls; unbounded CT mining is out of scope.

**Cap**: `CT_MAX_CERTS_PER_HOST` (default e.g. 20) per run to avoid Let’s Encrypt churn flooding a single invocation.

---

## Decision D4 — No DomainCertificateState writes (proposed)

0.006 writes **only** `CertificateInventoryItem`. Setting `CT_SEEN` / `ctSeen` on `HOST#` pairs is **0.007** when the gate/policy needs that linkage.

**Rationale**: Keeps “CT ≠ trust” and “inventory ≠ hostname relationship” crisp for tests and reviews.

---

## Decision D5 — Schedule: EventBridge daily (proposed)

- Rate: `rate(1 day)` for MVP (tunable)
- Same package bundled as Lambda handler that iterates seeds
- CLI remains the primary local/dev tool

**Alternative**: CLI-only for 0.006 and defer Lambda — smaller PR, but then “pipeline” is manual. Prefer shipping the schedule so inventory accumulates without babysitting.

---

## Decision D6 — Serial encoding: lowercase hex (proposed)

Normalize serial to lowercase hex without `0x` prefix (strip leading zeros optionally? **Keep full hex as parsed from cert**, lowercase only).

---

## Decision D7 — Alarms: none (proposed)

Match 0.002 — no CloudWatch alarms in this feature. Failures surface in Lambda logs / CLI exit codes.

---

## crt.sh mechanics (implementation notes)

1. Search: `GET https://crt.sh/?q=<hostname>&output=json`  
   - Prefer exact hostname query first; optional `%.hostname` later if needed  
   - Response rows include `id`, `issuer_name`, `name_value`, `not_before`, `not_after`, `serial_number`, timestamps  
2. Leaf material: download PEM/DER for that `id` (crt.sh supports cert download by id) and parse with Node `crypto` / `X509Certificate` (Node 20)  
3. Deduplicate by `certificateSha256` before upsert  
4. Timeouts + limited retries; on persistent failure, log and continue next host

**Risk**: crt.sh may throttle or change shape — treat as best-effort evidence source, not a hard runtime dependency of `/v1/check`.

---

## Locked (2026-08-13)

Human approved D1–D7 as proposed:

1. **crt.sh + PEM CLI** — yes  
2. **no DER in S3** — yes  
3. **EventBridge scheduled Lambda** + CLI — yes  
4. Initial seed — **`example.com`** only for MVP (env-expandable)
