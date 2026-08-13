# Notes: TLS Observer

## Milestone use

1. `webnotary-observer example.com` → get `certificateSha256`
2. Put DomainCertificateState with `status=SINGLE_OBSERVED`
3. `POST /v1/check` → `valid`

Lambda packaging deferred to 0.005.
