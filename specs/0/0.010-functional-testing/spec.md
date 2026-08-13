# Feature Specification: Functional Testing (Top Sites Report)

**Feature Branch**: `0.010-functional-testing`  
**Created**: 2026-08-13  
**Status**: Active  
**Source**: Human direction — observe top sites, ask WebNotary, write report

## Intent

Run a **real-world functional probe**:

1. Take a fixed list of the **top 25** public websites  
2. **Independently observe** each site’s TLS leaf certificate (via `@webnotary/observer`)  
3. Ask the deployed WebNotary API (`POST /v1/check`) whether that hostname + fingerprint is trusted **by WebNotary**  
4. Write a **report** (Markdown + JSON) summarizing results  

This proves the public service end-to-end from an operator laptop, using live certificates—not only hand-seeded fixtures.

## In Scope

- Curated top-25 hostname list (static, versioned in repo)
- Observe each hostname:443 with existing observer (SSRF-safe)
- Call `https://api.webnotary.org/v1/check` (overridable) with observed `certificateSha256`
- Emit report files under `packages/functional-tests/reports/` (gitignored) or a path from CLI
- Per-site rows: observe success/failure, `tlsValid`, fingerprint, API HTTP status, public `status` (`valid`|`unknown`|`conflict`), errors, timing
- Summary counts at top of report
- SpecKit + README how to run

## Out of Scope

- Scraping Alexa/Tranco live on every run (list is curated/static for reproducibility)
- Automatically seeding CT inventory or waiting for SQS observers to flip sites to `valid`
- Chrome extension tests
- Load testing
- Terraform / AWS deletes
- Claiming PKI/`tlsValid` equals WebNotary `valid` (different meanings — report both)

## Semantics (important)

| Signal | Meaning |
|--------|---------|
| Observer `tlsValid` | Browser-like PKI validation of the live connection |
| API `valid` | WebNotary has independently established trust for that hostname+cert (dev: often `SINGLE_OBSERVED`) |
| API `unknown` | WebNotary does not yet establish that relationship (common for cold sites under CT gate) |
| API `conflict` | Client FP disagrees with an already-observed cert for that host |

A healthy first run may show mostly `unknown` until inventory + observers catch up. The report still succeeds as a functional run if observe+check complete.

## User Stories

### US1 — Top-25 observe and check (P1)

Operator runs one command; each of 25 sites is observed and checked against the API.

### US2 — Written report (P1)

Command writes Markdown + JSON reports with per-site detail and summary counts.

### US3 — Failures are visible (P1)

Observe timeouts / API errors appear as row failures without aborting the whole batch (unless `--fail-fast`).

## Success Criteria

1. `npm run functional` (or CLI) processes all 25 sites and writes a report.
2. Report is human-readable and machine-readable (JSON).
3. Spec documents list source and status semantics.

## Dependencies

- Requires: `@webnotary/observer`, deployed API (0.009+)
- Soft: CT inventory / prior observations affect how many `valid` appear
