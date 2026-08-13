# Manual Tester: Verification Orchestration

**Status**: Stub

1. Unknown check returns immediately; exactly one pending/SQS job appears.
2. Repeat unknown; no additional probe fan-out.
3. After observer runs, DynamoDB state and S3 object exist.
4. Confirm client sighting fields never alone produce VALID.
