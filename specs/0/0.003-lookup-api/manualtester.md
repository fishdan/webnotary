# Manual Tester: Lookup API

**Status**: Spec ready; run after implementation

## Local

```bash
cd packages/lookup-api && npm test
```

## After deploy

Seed (example conceptual item):

```text
pk=HOST#example.com
sk=CERT#<64-hex>
status=SINGLE_OBSERVED
entityType=DOMAIN_CERT
hostname=example.com
certificateSha256=<64-hex>
updatedAt=<iso>
```

1. `POST /v1/check` known pair → `{"status":"valid"}`
2. Unknown pair → `{"status":"unknown"}`
3. Item with `CONFLICT` → `{"status":"conflict"}`
4. Bad fingerprint → `400`
5. Confirm no SQS messages created for unknown
