# Manual Tester: Chrome Extension

1. Chrome 144+ → `chrome://extensions` → Developer mode → Load unpacked → `extensions/webnotary`
2. Open `https://example.com` → popup should show **valid** (seeded / acquired trust).
3. Open a fresh HTTPS site → first visit may call API; badge `?` or calm if acquire returns valid.
4. Reload same site quickly → **no new** network call to WebNotary if cached valid (verify in DevTools → Network for extension SW, or service worker logs).
5. Options: change API URL to legacy execute-api URL; confirm still works.
6. Conflict: hard to force without a crafted host; skip unless a known CONFLICT row exists.
