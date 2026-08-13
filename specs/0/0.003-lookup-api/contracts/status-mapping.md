# Status Mapping (0.003)

Authority for public API mapping until 0.007 replaces/extends it.

## Public statuses

| Public | Meaning |
|--------|---------|
| `valid` | WebNotary currently treats the pair as independently established enough for MVP |
| `unknown` | No usable establishment (including CT-only / unset) |
| `conflict` | Stored conflict evidence |

## Mapping table

| DynamoDB `status` (or condition) | Public `status` |
|----------------------------------|-----------------|
| *(item missing)* | `unknown` |
| `UNKNOWN` | `unknown` |
| `CT_SEEN` | `unknown` |
| `SINGLE_OBSERVED` | `valid` *(dev MVP mapping)* |
| `MULTI_OBSERVED` | `valid` |
| `ESTABLISHED` | `valid` |
| `CONFLICT` | `conflict` |
| unrecognized non-empty value | `unknown` (safe default; log) |

## Rules

- Never return internal enum strings to clients.
- Never elevate client sightings alone to `valid` (0.003 does not write sightings).
- 0.007 may change which internal states map to `valid` without changing the public response shape.
