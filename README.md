# WebNotary

Public-interest TLS trust infrastructure that answers one question for a browser:

> **Is this certificate independently known for this hostname?**

Traditional PKI checks that a certificate chains to a trusted CA and matches the name. WebNotary adds an independent view: does the leaf certificate the browser sees agree with certificates **observed from elsewhere** on the Internet?

**Clients can request investigation. Only observers create trust.** A browser extension may report what it sees; that report alone never marks a certificate as trusted.

Product intent lives in [`webnotary.md`](./webnotary.md). Engineering constraints live in [`.specify/memory/constitution.md`](./.specify/memory/constitution.md).

## Status

**Release 0** is a working MVP: public lookup API, TLS observers, Certificate Transparency inventory (evidence, not trust), abuse-aware verification, and a developer Chrome extension.

## Try the API

```bash
curl -sS -X POST 'https://api.webnotary.org/v1/check' \
  -H 'content-type: application/json' \
  -d '{"hostname":"example.com","certificateSha256":"<leaf-sha256-hex>"}'
```

| Field | Meaning |
|-------|---------|
| `hostname` | Site name (IDNA/punycode, lowercased) |
| `certificateSha256` | Leaf certificate SHA-256 fingerprint (lowercase hex) |

Response `status`:

| Status | Meaning |
|--------|---------|
| `valid` | Independently known / observed for this host |
| `unknown` | Not yet established (may queue observation under policy) |
| `conflict` | Host already associated with a different observed certificate |

`unknown` does **not** mean malicious.

## Chrome extension (developer)

Unpacked MV3 extension under [`extensions/webnotary/`](./extensions/webnotary/). It captures the HTTPS main-frame leaf fingerprint, uses a local trust cache, and calls `/v1/check` only on miss or expiry.

Requires **Chrome 144+** and the flag [`chrome://flags/#web-request-security-info`](chrome://flags/#web-request-security-info) (**Enable SecurityInfo in WebRequest API**). Install steps: [`extensions/webnotary/README.md`](./extensions/webnotary/README.md).

## How it fits together

```text
Chrome extension ──► POST /v1/check ──► Lookup Lambda ──► DynamoDB
                                              │
                         unknown + policy OK ─┼─► SQS ──► Observer / verify worker
                                              │              ├─► Dynamo trust state
                                              │              └─► S3 raw evidence

CT ingest ──► certificate inventory only (does not create host trust)
```

Hard rules for this release:

1. Client sightings never elevate trust.
2. CT proves a cert was logged — not that the site is serving it.
3. Unknown must not create unbounded work (dedupe, CT gate; acquire mode is an explicit ops toggle).
4. Prefer serverless AWS; avoid destroying production-critical resources via Terraform.

## Repository layout

| Path | Role |
|------|------|
| [`packages/`](./packages/) | TypeScript libraries and Lambdas (data-model, lookup-api, observer, workers, CT ingest, trust-policy, functional tests) |
| [`extensions/webnotary/`](./extensions/webnotary/) | Chrome MV3 client |
| [`infra/`](./infra/) | Terraform (us-east-1 serverless foundation + API domain) |
| [`specs/0/`](./specs/0/) | SpecKit Release 0 feature catalog and history |
| [`webnotary.md`](./webnotary.md) | Product / architecture source of truth |

## Contributing / SpecKit

Work is spec-driven. Each feature under `specs/0/` has `spec.md`, `plan.md`, and a human-readable `tasks.md`. Start from the [Release 0 index](./specs/0/README.md) for dependencies, status, and reading order.

AI-assisted sessions in this repo follow [`start.ai`](./start.ai).

## License / use

Public-interest security infrastructure. Treat the API as a best-effort trust signal, not a substitute for PKI validation in the browser.
