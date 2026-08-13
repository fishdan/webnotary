# Manual Tester: CT Inventory Pipeline

**Status**: Active with SpecKit  
**Branch**: `0.006-ct-inventory-pipeline`

## Prerequisites

- AWS creds that can read/write the `webnotary-dev` DynamoDB table
- `TABLE_NAME` set (or passed) to the CLI / Lambda env
- Built package: `cd packages/ct-ingest && npm test && npm run build`

## Cases

### M1 — Offline PEM ingest (no CT network)

1. Obtain a leaf PEM (e.g. from `openssl s_client -connect example.com:443 -servername example.com` / observer output).
2. Run `webnotary-ct-ingest file --pem <path> --ct-source file` (or `--dry-run` first).
3. **Expect**: DynamoDB item `pk=CERT#<sha256>`, `sk=META`, `entityType=CERT_INVENTORY`, fingerprints + validity populated.
4. **Expect**: No `HOST#…` item created by this command alone.

### M2 — crt.sh hostname ingest

1. Run `webnotary-ct-ingest host example.com` (live).
2. **Expect**: One or more inventory items; `ctSource=crt.sh`; SANs/issuer/serial present when parse succeeds.
3. Spot-check GetItem for a returned fingerprint.

### M3 — Idempotent re-run

1. Note `ctFirstSeen` and `ctLastSeen` on an inventory item.
2. Re-run the same ingest.
3. **Expect**: Same single item; `ctFirstSeen` unchanged; `ctLastSeen` ≥ previous; no duplicate keys.

### M4 — Trust boundary

1. Before/after M2, query for any `HOST#example.com` items **created solely by ingest** (baseline may already have observer rows from 0.005 — those are OK).
2. **Expect**: Ingest does not create new HOST# rows and does not flip statuses to VALID-equivalent.

### M5 — Scheduled Lambda (if shipped)

1. Invoke the CT ingest Lambda once (console or CLI) with seed including `example.com`.
2. **Expect**: CloudWatch logs show per-host results; inventory updated; API `/v1/check` behavior unchanged for random unknown fingerprints (still unknown; still may enqueue until 0.007).
