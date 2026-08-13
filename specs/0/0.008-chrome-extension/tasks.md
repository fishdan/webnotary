# Tasks: Chrome Extension

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md)  
**Status**: Scaffold complete — manual Chrome 144+ validation next  
**Branch**: `0.008-chrome-extension`

**Goal**: MV3 extension that caches WebNotary trust for HTTPS main-frame certs and calls `api.webnotary.org` only when needed, with clear unknown/conflict UX.

---

## Phase 1: Spec & scaffold

- [x] T001 Flesh SpecKit; note Subscribed Toolbar patterns + Chrome 144 `securityInfo`
- [x] T002 Create `extensions/webnotary/` MV3 scaffold (manifest, SW, popup, options, icons, README)

## Phase 2: Core logic

- [x] T003 Fingerprint normalize helper (`lib/fingerprint.js`)
- [x] T004 Local trust cache read/write/expiry (`lib/cache.js`)
- [x] T005 `webRequest.onHeadersReceived` main_frame HTTPS → evaluate cache → optional `/v1/check`
- [x] T006 Badge + popup UX for valid / unknown / conflict; conflict notification

## Phase 3: Validate

- [ ] T007 Manual: load unpacked; visit `https://example.com` → expect valid; cold site; confirm cache skips repeat API calls
- [ ] T008 Update progress.ai; PR when requested
