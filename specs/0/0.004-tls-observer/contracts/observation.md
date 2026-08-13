# Observation Contract

```json
{
  "hostname": "accounts.google.com",
  "remoteIp": "142.250.x.x",
  "observedAt": "2026-08-13T16:54:00.000Z",
  "observerId": "local-cli",
  "tlsValid": true,
  "certificateSha256": "64-hex",
  "spkiSha256": "64-hex",
  "notBefore": "ISO-8601",
  "notAfter": "ISO-8601",
  "issuer": "...",
  "subject": "...",
  "sans": ["accounts.google.com", "..."],
  "port": 443
}
```

Errors: throw / CLI exit 1 with message; never emit partial trust decisions.
