# Notes: CT Inventory Pipeline

## Source map

- `webnotary.md` — Core principle “CT is evidence, not trust”; Step 8 (CT ingestion); inventory conceptual fields
- Constitution — XXI (CT ≠ trust), XXIV (separate collection from serving)
- Schema — `specs/0/0.001-operational-data-model/data-model.md` → `CertificateInventoryItem`

## Dependencies

- Requires: 0.001, 0.002 (table)
- Enables: 0.007 (gate + policy)
- Does not require: 0.003–0.005 to ingest (shared table only)

## Locked decisions

Human approved proposed MVP (2026-08-13).

| ID | Decision | Locked? |
|----|----------|---------|
| D1 | CT source = crt.sh + PEM CLI | yes |
| D2 | No DER in S3 (hash in memory only) | yes |
| D3 | Seed hostname list + per-host cap | yes |
| D4 | No HOST# / DomainCertificateState writes | yes |
| D5 | EventBridge daily Lambda + CLI | yes |
| D6 | Serial = lowercase hex | yes |
| D7 | No alarms | yes |

Default seed: `example.com`. Default `CT_MAX_CERTS_PER_HOST`: 20.

## Follow-ups for 0.007

- Gate `/v1/check` unknown enqueue on inventory GetItem
- Optionally set `CT_SEEN` / `ctSeen` on domain-cert pairs when policy needs it
