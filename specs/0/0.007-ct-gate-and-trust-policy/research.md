# Research: CT Gate and Trust Policy

## Decision D1 — Gate on inventory GetItem (proposed)

Enqueue only if `GetItem(pk=CERT#fp, sk=META)` exists.

- Missing inventory → return `unknown`, **no** `tryEnqueue`
- Present inventory + public `unknown` → `tryEnqueue` as today
- Public `valid` / `conflict` → never enqueue (unchanged)

Client sightings still recorded for CT-unknown (cheap UpdateItem); probes are what we gate.

---

## Decision D2 — Policy package location (proposed)

Create `packages/trust-policy` with:

- `toPublicStatus(stored)` — move current `mapStatus` logic here
- `shouldEnqueueVerification({ publicStatus, inventoryKnown })`
- CONFLICT helpers as needed

`lookup-api` depends on it; 0.008 extension talks only to HTTP API.

Keep `mapStatus.ts` as a thin re-export during transition or delete after move.

---

## Decision D3 — Dev VALID rule (proposed)

Document and keep:

```text
SINGLE_OBSERVED | MULTI_OBSERVED | ESTABLISHED → valid
CT_SEEN | UNKNOWN | missing → unknown
CONFLICT → conflict
```

Explicit comment/README: single-observer VALID is **development policy**, not production.

No code change required beyond moving mapping into the policy package — already matches 0.003.

---

## Decision D4 — CONFLICT MVP (proposed)

**On `/v1/check`**, after normalizing inputs:

1. Load status for `(hostname, clientFp)` as today.
2. If that status already maps to `conflict` or `valid`, return it (no sibling scan needed for valid).
3. Else **Query** `pk = HOST#hostname` for sibling domain-cert items.
4. If any sibling has status in `{SINGLE_OBSERVED, MULTI_OBSERVED, ESTABLISHED}` and `certificateSha256 ≠ clientFp` → treat as **conflict** for this response (and do not enqueue).

**Rationale**: Client is presenting a different leaf than one WebNotary has independently observed for that hostname — surface CONFLICT strongly (webnotary.md).

**Rotation caveat**: Legitimate cert rotation will look like conflict until a new observation establishes the new cert (or policy evolves). Acceptable for MVP; note in progress.

**Alternative considered**: Only set CONFLICT in the worker when observation disagrees with an existing observed cert — weaker for the browser path (client would keep getting `unknown` + probes). Prefer check-time sibling rule.

---

## Decision D5 — CT_SEEN stamp (proposed)

When inventory is known and domain-cert row is missing or `UNKNOWN`, best-effort UpdateItem to `status=CT_SEEN` (never downgrade `SINGLE_OBSERVED+` / `CONFLICT`). Public mapping remains `unknown`.

Helps operators see progression in Dynamo without granting trust.

---

## Decision D6 — Infra (proposed)

No new Terraform. Lookup role already can Get/Update table items.

---

## Locked (2026-08-13)

Human approved D1–D6 as proposed, including sibling CONFLICT MVP and temporary rotation caveat.

