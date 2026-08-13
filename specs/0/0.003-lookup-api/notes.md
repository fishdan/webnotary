# Notes: Lookup API

## Source map

- `webnotary.md` — Public API; Step 3; Initial Development Milestone
- Constitution — XXII, XXIII, XXV

## Contract sketch

```json
POST /v1/check
{ "hostname": "example.com", "certificateSha256": "ABC123..." }
→ { "status": "valid" | "unknown" | "conflict" }
```

## Dependencies

- Requires: 0.001, 0.002
- Extended by: 0.005, 0.007
