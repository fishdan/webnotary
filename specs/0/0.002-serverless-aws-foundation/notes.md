# Notes: Serverless AWS Foundation

## Source map

- `webnotary.md` — AWS MVP Architecture; Step 2
- Constitution — IX, XV, XVI, XXIII, XXIV
- Upstream — `specs/0/0.001-operational-data-model/data-model.md`

## Downstream

| Spec | Needs from 0.002 |
|------|------------------|
| 0.003 Lookup API | HTTP API, DynamoDB, verify queue; **creates lookup IAM role** |
| 0.004 / 0.005 Observer | Queue, evidence bucket, DDB; **creates observer IAM role** |

## Decisions

- No alerts in 0.002
- No IAM roles in 0.002 (Albert stays as constrained deployer; no new user/role yet)
