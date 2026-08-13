# Manual Tester: TLS Observer

**Status**: Stub

1. Observe a known public host; confirm fingerprints match an independent tool (e.g. openssl).
2. Attempt localhost / link-local / metadata targets; confirm refusal.
3. Confirm output includes remote IP, timestamps, and leaf/SPKI hashes.
