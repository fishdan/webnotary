# Notes: Operational Data Model

## Source map

- `webnotary.md` — Data Model; Step 1; Abuse and Cost Controls
- Constitution — IX, XXI, XXIII, XXIV

## Design anchors (draft)

```text
PK = HOST#example.com
SK = CERT#<sha256>

PK = VERIFY#example.com  (pending)
```

Inventory conceptual fields: certificateSha256, spkiSha256, issuer, serial, notBefore, notAfter, SANs, ctFirstSeen, ctLastSeen.

## Dependencies

- Blocks: 0.002, 0.003, 0.005
- Informs: 0.006 (inventory population), 0.007 (status progression)
