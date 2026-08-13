# Research: Functional Testing (Top Sites Report)

## Decision D1 — Curated static top 25 (locked)

Use a versioned list of widely known public sites in `sites.ts` (Google, YouTube, Wikipedia, Amazon, etc.).  
Reproducible; no third-party rank API dependency. Can refresh the list later from Tranco manually.

## Decision D2 — Observe then check (locked)

1. `observe(hostname)` for live leaf fingerprint  
2. `POST { hostname, certificateSha256 }` to WebNotary  

Do not invent fingerprints.

## Decision D3 — Report formats (locked)

Write both:

- `report-<timestamp>.json` — full machine detail  
- `report-<timestamp>.md` — summary table for humans  

## Decision D4 — Batch continues on error (locked)

One site failing observe/check does not stop the run. Exit code non-zero if any row failed hard (observe throw / non-2xx/4xx unexpected).

## Decision D5 — `unknown` is an expected outcome (locked)

First-run reports with many `unknown` are OK. Document in report footer that WebNotary trust ≠ PKI validity.

## List notes

Prefer apex names the observer can resolve to public IPs. Avoid sites that only serve bot-blocked TLS if they break observe; swap list entries if a hostname consistently fails.
