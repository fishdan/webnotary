# Feature Specification: TLS Observer

**Feature Branch**: `0.004-tls-observer`  
**Created**: 2026-08-13  
**Status**: Specified / implementing  
**Source**: `webnotary.md` § Observer Behavior, Steps 4–5; Constitution XXIII, XXVI  
**Depends on**: 0.001 (`@webnotary/data-model` hostname normalization)

## Intent

Build a standalone TLS observer that, given a hostname, independently records what certificate that host presents from this network location — **CLI-first** for the initial development milestone. The same core `observe()` API must be reusable later as a Lambda worker (0.005).

## In Scope

- Hostname validation via `@webnotary/data-model`
- DNS resolution (A/AAAA)
- Reject non-public destinations (loopback, private, link-local, metadata, multicast, reserved)
- DNS-rebinding defense: re-check destination immediately before connect; connect to a concrete allowed IP with SNI=hostname
- TCP port **443 only**
- TLS handshake with SNI; capture leaf (+ chain when available)
- Normal PKI validation (`rejectUnauthorized: true`)
- SHA-256 of leaf DER + SHA-256 of SPKI
- Structured JSON observation on stdout
- CLI: `webnotary-observer <hostname>`
- Unit tests: destination blocking, hashing helpers, hostname rejection
- Export library API for later Lambda packaging (no SQS/Lambda deploy in this feature)

## Out of Scope

- Writing DynamoDB trust state / VALID (0.005 / 0.007)
- SQS event source / observer Lambda Terraform (0.005)
- Multi-observer signing
- Forcing a client-reported certificate
- Ports other than 443
- Writing S3 evidence (0.005)

## User Scenarios & Testing

### US1 — Observe public HTTPS host (P1)

`npx webnotary-observer accounts.google.com` (or package bin) prints JSON with hostname, remoteIp, fingerprints, validity dates, issuer, SANs, tlsValid.

**Independent Test**: Run against a well-known public host; fingerprints match openssl/independent check for leaf SHA-256.

### US2 — Block dangerous destinations (P1)

Hostnames that resolve only to private/loopback/metadata ranges fail **before** TLS connect.

**Independent Test**: Unit tests for IP classification; integration-style test with mocked DNS returning `127.0.0.1` / `169.254.169.254`.

### US3 — Library reusable for Lambda (P2)

`observe(hostname)` returns the same structured object the CLI prints.

**Independent Test**: Import library in a unit/smoke test without CLI.

## Requirements

- **FR-001**: MUST validate/normalize hostname before DNS.
- **FR-002**: MUST resolve DNS and reject if no usable public address.
- **FR-003**: MUST refuse private, loopback, link-local, ULA, multicast, and cloud metadata ranges (IPv4+IPv6).
- **FR-004**: MUST connect only to port 443.
- **FR-005**: MUST set TLS SNI to the canonical hostname.
- **FR-006**: MUST compute `certificateSha256` and `spkiSha256` as lowercase hex.
- **FR-007**: MUST set `tlsValid` from PKI validation outcome (authorized chain to trusted CAs).
- **FR-008**: MUST record `remoteIp`, `observedAt` (ISO-8601), and `observerId`.
- **FR-009**: MUST NOT accept or use a client-supplied certificate to alter the handshake.
- **FR-010**: CLI MUST print one JSON object to stdout; errors to stderr with non-zero exit.

## Success Criteria

- **SC-001**: Observe `example.com` (or similar) successfully with fingerprints present.
- **SC-002**: Blocked destinations never open a TLS socket (tested).
- **SC-003**: Unit tests pass without AWS.
- **SC-004**: Observation JSON matches the field set in the plan/contract.

## Assumptions

- Runs on Node 20+.
- Uses platform trust store for PKI validation.
- First milestone uses CLI only; Lambda packaging lands with 0.005 wiring.
