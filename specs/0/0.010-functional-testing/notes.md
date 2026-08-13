# Notes: Functional Testing

## Locked direction (2026-08-13)

Primary suite = **top 25 websites → observe certs → POST /v1/check → write report**.

| ID | Decision |
|----|----------|
| D1 | Curated static top 25 |
| D2 | Observe then check |
| D3 | Markdown + JSON reports |
| D4 | Continue on per-site errors |
| D5 | Many `unknown` OK on cold system |

## Run

```bash
cd packages/functional-tests
npm install
npm run build
npm run functional
# reports under ./reports/
```
