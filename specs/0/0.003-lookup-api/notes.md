# Notes: Lookup API

## Source map

- `webnotary.md` — Public API; Step 3; Initial Development Milestone
- Constitution — XXI, XXII, XXIII, XXV
- 0.001 — keys + `@webnotary/data-model`
- 0.002 — HTTP API + DynamoDB table outputs

## Contracts

- [check-api.md](./contracts/check-api.md)
- [status-mapping.md](./contracts/status-mapping.md)

## Deployed (dev)

- Check URL: `https://5jdix54pag.execute-api.us-east-1.amazonaws.com/v1/check`
- Lambda: `webnotary-dev-lookup`
- Role: `webnotary-dev-lookup-role` (GetItem + logs only)
