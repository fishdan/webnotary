# Plan: Path-Mismatch Conflict Severity

## Approach

1. Add `classifyConflictSeverity` + summary helpers in `@webnotary/trust-policy`.
2. Lookup handler: on conflict, compute observed leaf count from siblings, CT inventory for client FP, attach severity payload.
3. Extension: parse new fields; severity-aware notify; situation-signature archive upsert; UX copy.

## Severity rules (MVP)

```text
if observedLeafCount >= 2 OR clientInCtInventory → info
else → attention
```

`alert` unused until multi-observer policy exists.

## Signals

- `browserPkiAssumed: true` — extension path always; API sets true for conflict responses (check implies browser-presented leaf that client trusts enough to query).
- `observedLeafCount` — distinct OBSERVED/ESTABLISHED siblings for host.
- `clientInCtInventory` — client leaf present in CERT#/META inventory.
