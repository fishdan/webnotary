# Research: TLS Observer

## Decision: CLI + library now; Lambda later

**Choice**: Ship `observe()` + CLI in 0.004; Terraform/SQS Lambda in 0.005.

**Rationale**: Matches `webnotary.md` Step 4 before Step 5; completes first milestone without blocking on queue wiring.

## Decision: Connect to resolved IP with SNI

**Choice**: `tls.connect({ host: allowedIp, servername: hostname, port: 443 })`.

**Rationale**: Ensures we only dial an address that passed the public-IP check (rebinding defense).

## Decision: Platform PKI via rejectUnauthorized

**Choice**: Default Node TLS trust store.

## Decision: Block broad non-public ranges including 169.254.0.0/16 and 100.64.0.0/10

**Rationale**: Metadata + carrier-grade NAT / SSRF classics.
