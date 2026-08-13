# Notes: Chrome Extension

## Reference extension

`/home/dfish/IdeaProjects/Utilities/extensions/subscribed-toolbar`

Reuse: MV3 service worker, storage settings, options page messaging, load-unpacked README style.

## API

Default: `https://api.webnotary.org/v1/check`  
Body: `{ "hostname", "certificateSha256" }`

## Chrome requirement

Minimum **144** for `webRequest` `securityInfo`.
