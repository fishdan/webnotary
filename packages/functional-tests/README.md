# @webnotary/functional-tests

Observe TLS certificates for a curated **top 25** websites, ask the live WebNotary
API whether each hostname+fingerprint is trusted, and write a report.

## Run

```bash
cd packages/functional-tests
npm install
npm run functional
```

Reports land in `./reports/` (gitignored):

- `report-<timestamp>.md` — human table + summary
- `report-<timestamp>.json` — full machine detail

## Config

| Env / flag | Default |
|------------|---------|
| `WEBNOTARY_CHECK_URL` | `https://api.webnotary.org/v1/check` |
| `--out-dir` | `./reports` |
| `--concurrency` | `2` |

## Reading results

- **Observe TLS** = normal PKI check of the live site
- **API status** = WebNotary trust (`valid` / `unknown` / `conflict`)
- Many **unknown** values are expected until CT + observers establish those hosts

Exit code `1` if any observe or API hard errors occurred (not merely `unknown`).
