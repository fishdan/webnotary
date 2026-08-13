# Notes: CT Gate and Trust Policy

## Source map

- `webnotary.md` — Trust States; Steps 9–10; abuse controls (CT gate)
- Constitution — XXI, XXII, XXIII
- Prior: 0.003 status mapping; 0.005 enqueue; 0.006 inventory

## Internal progression sketch

```text
UNKNOWN → CT_SEEN → SINGLE_OBSERVED → MULTI_OBSERVED → ESTABLISHED
(+ CONFLICT)
```

Public: `valid` | `unknown` | `conflict` only.

## Locked decisions

Human approved proposed MVP (2026-08-13).

| ID | Decision | Locked? |
|----|----------|---------|
| D1 | Inventory GetItem before enqueue | yes |
| D2 | `packages/trust-policy` | yes |
| D3 | Dev VALID = SINGLE_OBSERVED+ (unchanged mapping) | yes |
| D4 | CONFLICT = sibling observed FP ≠ client FP | yes |
| D5 | CT_SEEN stamp when inventory known | yes |
| D6 | No new Terraform resources | yes |

Rotation caveat accepted for MVP (D4 may surface temporary conflict during cert rotation).

## Dependencies

- Requires: 0.005, 0.006
- Enables: safer public testing before 0.008
