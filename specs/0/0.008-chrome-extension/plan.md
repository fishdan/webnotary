# Implementation Plan: Chrome Extension

**Branch**: `0.008-chrome-extension` | **Spec**: [spec.md](./spec.md)

## Layout

```text
extensions/webnotary/
  manifest.json          # MV3, min_chrome_version 144
  background.js          # service worker
  popup.html / popup.js
  options.html / options.js
  lib/cache.js
  lib/check.js
  lib/fingerprint.js
  icons/
  README.md
```

## Cert acquisition (locked approach)

`chrome.webRequest.onHeadersReceived` with `extraInfoSpec: ["securityInfo"]`, filter `types: ["main_frame"]`, `urls: ["https://*/*"]`.

Leaf fingerprint from `details.securityInfo.certificates[0].fingerprint.sha256`, normalized to 64 lowercase hex.

## Cache

Key: `trust:${hostname}` → `{ certificateSha256, status, validatedAt, notAfter, expiresAt }`  
Only cache `valid` for silent reuse. Store last `unknown`/`conflict` for popup display but still recheck on next navigation after short cooldown (e.g. 5 min) to avoid hammering.

## UX

| Status | Badge | Popup |
|--------|-------|-------|
| valid (cached or fresh) | green / blank | “Trusted by WebNotary” |
| unknown | `?` yellow | “Not yet independently verified” |
| conflict | `!` red | Strong warning |
| no HTTPS / no cert | — | Explain |

## Borrowed from Subscribed Toolbar

- `chrome.storage` settings get/set helpers  
- Options page save + message to SW  
- README load-unpacked steps  
- `chrome.runtime.onInstalled` init  

## Non-goals

Store listing, Firefox primary support.
