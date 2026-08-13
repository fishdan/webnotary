# Feature Specification: Chrome Extension

**Feature Branch**: `0.008-chrome-extension`  
**Created**: 2026-08-13  
**Status**: Active  
**Source**: `webnotary.md` § Intended Extension Behavior, Steps 12–13; Constitution XXII, XXV  
**Reference**: `/home/dfish/IdeaProjects/Utilities/extensions/subscribed-toolbar` (MV3 patterns)

## Intent

Ship a minimal Manifest V3 Chrome extension that:

1. Sees the **hostname + leaf certificate SHA-256** for HTTPS main-frame navigations  
2. Consults a **local trust cache**  
3. Calls `POST https://api.webnotary.org/v1/check` **only** when not locally trusted / expired  
4. Surfaces `valid` quietly, `unknown` clearly, `conflict` strongly  

No browsing telemetry stream — only on-demand checks when the cache cannot satisfy.

## In Scope

- MV3 service worker + toolbar popup (+ light options for API base URL)
- Cert capture via `chrome.webRequest` `securityInfo` (Chrome 144+)
- Local cache in `chrome.storage.local`: hostname, certificateSha256, validatedAt, notAfter, status
- Cache TTL: min(certificate notAfter, validatedAt + maxTrustAge) — default max trust age 7 days
- Call WebNotary only on cache miss / expiry / fingerprint change
- Toolbar badge: blank/OK for valid; `?` unknown; `!` conflict
- Optional notification on conflict
- README: load unpacked (same flow as Subscribed Toolbar)
- Default API: `https://api.webnotary.org/v1/check`

## Out of Scope

- Firefox-only `getSecurityInfo` as primary path (may note later)
- Complex policy UI / multi-observer settings
- User accounts / auth
- Checking every subresource request
- Publishing to Chrome Web Store in this feature (dev unpacked is enough)
- Native messaging / local observer sidecar

## Key Requirements

| ID | Requirement |
|----|-------------|
| R1 | Constitution XXII — extension stays simple; backend owns policy |
| R2 | Constitution XXV — no per-pageload API spam; finite local trust |
| R3 | Clients are untrusted — extension never invents “valid” without API/cache |
| R4 | Fingerprint normalized to lowercase 64-hex (match backend) |
| R5 | Only `main_frame` HTTPS navigations trigger cert evaluation |
| R6 | Minimum Chrome version documents `securityInfo` availability (144+) |

## User Stories

### US1 — Cached valid is silent (P1)

Trusted unexpired pair → no `/v1/check`; badge calm.

### US2 — First sighting checks API (P1)

Uncached pair → one `/v1/check`; handle valid/unknown/conflict.

### US3 — Conflict is loud (P1)

`conflict` → distinctive badge and optional notification.

### US4 — Expired local trust revalidates (P2)

Past cache expiry → new check.

## Dependencies

- Requires: live `/v1/check` (0.003–0.009); acquire mode optional but helps cold sites
- Patterns borrowed from Subscribed Toolbar: MV3 SW, storage settings, options page, load-unpacked README
