# Manual Tester: Functional Testing

## Primary run

```bash
cd packages/functional-tests
npm install && npm run build && npm run functional
```

Open the newest `reports/report-*.md`.

### Expect

- 25 rows (or fewer if list trimmed)
- Each row has hostname, fingerprint (if observe OK), API status
- Summary counts at top
- No AWS resources deleted

### Interpret

- `observeTlsValid=true` + API `unknown` → live cert OK; WebNotary has not established trust yet  
- API `valid` → WebNotary already has independent evidence for that pair  
- API `conflict` → WebNotary has a different observed cert for that host  

## Optional single-site debug

```bash
webnotary-observer example.com
curl -sS -X POST https://api.webnotary.org/v1/check \
  -H 'content-type: application/json' \
  -d '{"hostname":"example.com","certificateSha256":"<fp from observe>"}'
```
