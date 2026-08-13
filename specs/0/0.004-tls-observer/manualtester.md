# Manual Tester: TLS Observer

```bash
cd packages/observer
npm test
node dist/cli.js example.com
# or: npx tsx src/cli.ts example.com
```

- [ ] JSON includes certificateSha256, spkiSha256, remoteIp, tlsValid
- [ ] `webnotary-observer 127.0.0.1` fails validation (IP literal)
- [ ] Fingerprint roughly matches `openssl s_client` / known tool for leaf
