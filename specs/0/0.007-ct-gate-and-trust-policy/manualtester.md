# Manual Tester: CT Gate and Trust Policy

**Status**: Stub

1. Submit garbage fingerprint → unknown, no SQS job.
2. Submit CT-known but unverified hostname relationship → one verification job.
3. After observation per dev policy → valid on subsequent check.
4. Craft conflict scenario per MVP rule → conflict.
