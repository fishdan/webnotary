# Notes: TLS Observer

## Source map

- `webnotary.md` — Observer Behavior; Steps 4–5; Initial Development Milestone
- Constitution — VII, XXIII, XXVI

## Observation sketch

```json
{
  "hostname": "accounts.google.com",
  "remoteIp": "...",
  "observedAt": "...",
  "tlsValid": true,
  "certificateSha256": "...",
  "spkiSha256": "...",
  "notBefore": "...",
  "notAfter": "...",
  "issuer": "...",
  "sans": []
}
```

## Dependencies

- Enables: 0.005
- Independent of: 0.006–0.008
