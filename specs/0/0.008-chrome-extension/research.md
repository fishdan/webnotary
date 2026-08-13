# Research: Chrome Extension

## Cert fingerprint in Chrome

- **Chrome 144+**: `webRequest` `securityInfo` / `securityInfoRawDer` on `onHeadersReceived` (async, MV3-friendly).
- **Firefox**: `browser.webRequest.getSecurityInfo` (blocking) — out of MVP scope.
- **Older Chrome**: no supported public API without debugger — document min version 144.

## Fingerprint encoding

Normalize whatever Chrome returns (possibly colon-hex or hex) to **lowercase 64-char hex** for `/v1/check`.

If only raw DER is available, SHA-256 the leaf DER bytes (same as backend).

## When to call API

| Situation | API call? |
|-----------|-----------|
| HTTPS main_frame, cache valid & unexpired & FP match | No |
| FP changed vs cache | Yes |
| Cache expired | Yes |
| unknown/conflict last result | Yes after cooldown (default 5 min) |
| http:// or chrome:// | No |

## Privacy

Listening to headers locally is not “telemetry.” Uploading hostname+FP to WebNotary only on cache miss is the intended protocol.
