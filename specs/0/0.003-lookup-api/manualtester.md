# Manual Tester: Lookup API

**Status**: Stub

1. Seed VALID pair in DynamoDB; POST /v1/check → valid.
2. Unknown pair → unknown.
3. Oversized/malformed body → 4xx, no DynamoDB write.
4. Confirm request does not block on TLS/network probe.
