# Implementation Plan: Functional Testing (Top Sites Report)

**Branch**: `0.010-functional-testing` | **Spec**: [spec.md](./spec.md)

## Flow

```text
top25 hostnames
    → observe(hostname)     [@webnotary/observer]
    → POST /v1/check        [api.webnotary.org]
    → append row
    → write report.md + report.json
```

## Package

`packages/functional-tests`

- `src/sites.ts` — curated top 25
- `src/checkClient.ts` — HTTP client for check API
- `src/run.ts` — orchestration (sequential or concurrency 2–3)
- `src/report.ts` — Markdown + JSON writers
- `src/cli.ts` — `webnotary-functional-test`

## Config

| Env / flag | Default |
|------------|---------|
| `WEBNOTARY_CHECK_URL` | `https://api.webnotary.org/v1/check` |
| `--out-dir` | `packages/functional-tests/reports` |
| `--concurrency` | `2` |

## Non-goals

Live Tranco download; auto-remediation of `unknown` → `valid`.
