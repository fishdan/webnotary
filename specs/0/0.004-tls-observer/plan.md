# Implementation Plan: TLS Observer

**Branch**: `0.004-tls-observer` | **Spec**: [spec.md](./spec.md)  
**Status**: Implementing

## Summary

`packages/observer` — library `observe(hostname)` + CLI bin. SSRF-safe DNS/IP checks, TLS:443 with SNI, leaf/SPKI hashes, PKI validation. No AWS writes.

## Structure

```text
packages/observer/
  package.json
  src/
    observe.ts
    netPolicy.ts
    fingerprints.ts
    cli.ts
  tests/
    netPolicy.test.ts
    fingerprints.test.ts
```

## Approach

1. `netPolicy`: classify IPs; filter DNS results.
2. `fingerprints`: SHA-256 leaf DER + SPKI from `X509Certificate`.
3. `observe`: normalize → resolve → filter → re-resolve → `tls.connect({host: ip, servername, port: 443, rejectUnauthorized: true})` → build observation.
4. CLI wraps `observe` and prints JSON.
5. Tests for policy + fingerprints; manual CLI smoke on public host.
