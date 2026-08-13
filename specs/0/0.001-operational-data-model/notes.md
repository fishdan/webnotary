# Notes: Operational Data Model

## Source map

- `webnotary.md` — Data Model; Step 1; Abuse controls; Trust states
- Constitution — IX, XXI, XXIII, XXIV

## Canonical docs

- Schema: [data-model.md](./data-model.md)
- Research: [research.md](./research.md)
- Library: `packages/data-model/`

## Downstream contracts

| Consumer | Uses |
|----------|------|
| 0.002 | Table keys `pk`/`sk`, TTL `expiresAt` |
| 0.003 | `hostCertKeys` + DomainCertificateState.status mapping |
| 0.005 | Pending VERIFY conditional put/delete; optional `lastEvidenceS3Key` |
| 0.006 | CERT inventory upsert |
| 0.007 | Status transition writers |

## Open for later specs (not blocking 0.001)

- Serial number encoding details for inventory (0.006)
- Exact S3 key template (0.005)
- Production multi-observer identity fields
