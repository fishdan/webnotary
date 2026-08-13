# Notes: Chrome Extension

## Source map

- `webnotary.md` — Intended Extension Behavior; Steps 12–13; Non-Goals
- Constitution — XXII, XXV

## Flow sketch

```text
visit → fingerprint → local trust? → allow : POST /v1/check → valid|unknown|conflict
```

## Dependencies

- After: 0.003+; preferably 0.005–0.007
- Does not block release-0 observer/API milestone
