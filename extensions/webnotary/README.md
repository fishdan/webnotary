# WebNotary Chrome Extension

Minimal Manifest V3 extension that checks the certificate for the current HTTPS
page against WebNotary (`POST /v1/check`), with a local trust cache so normal
revisits do not spam the API.

Requires **Chrome 144+** and the **WebRequestSecurityInfo** developer flag enabled
(the `securityInfo` webRequest extraInfoSpec is still gated in current Chrome builds).

## Enable cert access (required today)

Chrome still gates leaf-cert access behind a developer flag:

1. Open `chrome://flags/#web-request-security-info`  
   (**Enable SecurityInfo in WebRequest API**)
2. Set it to **Enabled**
3. Relaunch Chrome
4. On `chrome://extensions`, **Reload** WebNotary (dismiss/clear the error if still shown)

Without that flag, Chrome errors with:  
`ExtraInfoSpec.securityInfo is allowed only with WebRequestSecurityInfo developer flag`.

## Install (unpacked)

Same flow as Subscribed Toolbar:

1. Open `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select this directory: `extensions/webnotary`.
4. Open an `https://` site and click the WebNotary toolbar icon.

## Behavior

1. On HTTPS **main-frame** navigations, read leaf cert SHA-256 via `securityInfo`.
2. If local cache says **valid** and unexpired for that hostname+fingerprint → no API call.
3. Otherwise call `https://api.webnotary.org/v1/check`.
4. Badge: calm for valid, `?` for unknown, `!` for conflict (plus notification).

## Options

**Details → Extension options** → Check URL (default production API).

## Privacy

The extension does **not** stream browsing history. It only sends hostname +
certificate fingerprint when the local cache cannot answer.
