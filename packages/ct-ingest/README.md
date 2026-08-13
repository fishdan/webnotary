# @webnotary/ct-ingest

Certificate Transparency → DynamoDB certificate inventory (`CERT#` / `META`).

Evidence only — never writes `HOST#` trust state.

## CLI

```bash
export TABLE_NAME=webnotary-dev-table

# Offline (no crt.sh)
webnotary-ct-ingest file --pem leaf.crt --ct-source file

# Live CT search
webnotary-ct-ingest host example.com

# Print without writing
webnotary-ct-ingest host example.com --dry-run
```

## Lambda

Scheduled EventBridge handler reads `CT_SEED_HOSTNAMES` and upserts inventory for each host.
