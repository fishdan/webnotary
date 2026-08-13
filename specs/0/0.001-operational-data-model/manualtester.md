# Manual Tester: Operational Data Model

**Status**: Active

## Library checks (local)

```bash
cd packages/data-model
npm test
```

Expected: all normalization and key-builder tests pass.

## Interactive checks (Node REPL or small script)

1. Normalize `Example.COM.` → `example.com`.
2. Build host/cert keys for `example.com` + 64-hex fingerprint → `pk=HOST#example.com`, `sk=CERT#<fp>`.
3. Build inventory keys → `pk=CERT#<fp>`, `sk=META`.
4. Build pending keys → `pk=VERIFY#example.com`, `sk=PENDING`.
5. Confirm IP literal hostname normalization throws/rejects.
6. Confirm short/non-hex fingerprint rejects.

## Schema review checklist

- [ ] Client fields and observer fields are separate in `data-model.md`
- [ ] Pending conditional create + TTL documented
- [ ] No GSI required for AP1–AP7
- [ ] Inventory cannot be mistaken for domain trust in docs
- [ ] 0.002 engineer can provision from `data-model.md` alone

## AWS checks

Not in scope for 0.001 (no table provisioned yet). Re-test after 0.002 with real GetItem/PutItem conditionals.
