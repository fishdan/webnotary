# WebNotary Release 0 — SpecKit Index

Release 0 is the **minimum end-to-end system**: a public lookup API, independent TLS observation, CT inventory (evidence, not trust), abuse-aware verification, and a Chrome extension that asks whether a hostname/certificate pair is independently known.

> Clients can request investigation. Only observers create trust.

Product intent: [`/webnotary.md`](../../webnotary.md)  
Engineering law: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md)  
Progress history: [`.config/ai/progress.ai`](../../.config/ai/progress.ai)

## Public surface

| What | Where |
|------|--------|
| Check API | `POST https://api.webnotary.org/v1/check` |
| Body | `{ "hostname", "certificateSha256" }` |
| Statuses | `valid` \| `unknown` \| `conflict` |
| Extension (dev) | `extensions/webnotary/` (Chrome 144+; flag `#web-request-security-info`) |
| Region / table | `us-east-1` · `webnotary-dev-table` |

## Architecture spine

```text
Chrome extension ──► POST /v1/check ──► Lookup Lambda ──► DynamoDB
                                              │
                         unknown + policy OK ─┼─► SQS ──► Observer / verify worker
                                              │              │
                                              │              ├─► Dynamo trust state
                                              │              └─► S3 raw evidence
                                              │
CT ingest (crt.sh / PEM) ──► CERT#/META inventory only (no HOST# trust writes)
```

**Hard rules (Release 0):**

1. Client sightings never elevate trust.
2. CT proves a cert was logged — not that the site is serving it.
3. Unknown must not create unbounded work (dedupe + CT gate; acquire mode is an explicit toggle).
4. Terraform must not destroy production-critical AWS resources (zone is data-source only).

## Spec catalog

Each directory is one SpecKit feature. Open `spec.md` for intent, `plan.md` for approach, `tasks.md` for execution (human-readable standard: `0.005`).

| Spec | One-line purpose | Package / artifact | Depends on | Status |
|------|------------------|--------------------|------------|--------|
| [0.001](./0.001-operational-data-model/) | Dynamo single-table keys + shared TS model | `packages/data-model` | — | Merged (#1) |
| [0.002](./0.002-serverless-aws-foundation/) | Dynamo, SQS, S3, HTTP API shell | `infra/` | 0.001 | Merged (#2) |
| [0.003](./0.003-lookup-api/) | Read-only `POST /v1/check` | `packages/lookup-api` | 0.001–0.002 | Merged (#3) |
| [0.004](./0.004-tls-observer/) | Local TLS observe CLI/library | `packages/observer` | soft: 0.002 | Merged (#4) |
| [0.005](./0.005-verification-orchestration/) | Unknown → SQS → worker writes trust | `packages/verification-worker` | 0.001–0.004 | Merged (#5) |
| [0.006](./0.006-ct-inventory-pipeline/) | CT → inventory-only `CERT#/META` | `packages/ct-ingest` | 0.001 | Merged (#7) |
| [0.007](./0.007-ct-gate-and-trust-policy/) | CT membership gate + isolatable trust policy | `packages/trust-policy` | 0.005–0.006 | Merged (#8) |
| [0.008](./0.008-chrome-extension/) | MV3 extension: cache + check + badge | `extensions/webnotary` | backend E2E | Merged (#11) |
| [0.009](./0.009-api-custom-domain/) | `api.webnotary.org` (ACM + APIGW + R53) | `infra/` | 0.002–0.003 | Merged (#9) |
| [0.010](./0.010-functional-testing/) | Top-25 observe → check → report suite | `packages/functional-tests` | observer + API | Merged (#10) |
| [0.011](./0.011-acquire-mode/) | Sync-observe unknowns (`ACQUIRE_MODE`) | lookup-api + TF env | 0.007 | Merged (#10) |

## Suggested reading order

1. **Trust & storage** — 0.001 → 0.002  
2. **Read path** — 0.003 → 0.009  
3. **Write / verify path** — 0.004 → 0.005 → 0.007  
4. **Seeding** — 0.006 (parallel to verify; inventory only)  
5. **Client** — 0.008  
6. **Prove it** — 0.010 / 0.011  

## SpecKit layout (per feature)

| File | Role |
|------|------|
| `spec.md` | Intent, in/out of scope, acceptance |
| `plan.md` | Approach and decisions |
| `tasks.md` | Phased, human-readable checklist |
| `research.md` | Open questions / alternatives |
| `manualtester.md` | How a human validates |
| `notes.md` | Working notes |
| `contracts/` / `data-model.md` / `infrastructure.md` | As needed |

`tasks.md` quality bar: match [`0.005-verification-orchestration/tasks.md`](./0.005-verification-orchestration/tasks.md).

## What’s next

Release 0 MVP path is largely landed. Typical follow-ons (new SpecKit under `specs/0/` or `specs/1/`):

- Store-ready extension path if `#web-request-security-info` stays flag-gated  
- Turn `ACQUIRE_MODE` off for production cost/abuse posture once inventory coverage is strong  
- Multi-observer / richer conflict policy  
- Firefox `getSecurityInfo` (explicitly out of 0.008)

Create a new numbered stub + branch when starting the next feature; keep this README’s catalog in sync.
