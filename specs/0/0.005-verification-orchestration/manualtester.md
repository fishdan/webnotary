# Manual Tester

1. Pick a hostname without DomainCertificateState (or use fresh FP).
2. POST /v1/check twice quickly → still unknown; only one SQS/pending.
3. Wait for worker; confirm S3 object + DynamoDB SINGLE_OBSERVED for **observed** FP.
4. POST /v1/check with observed FP → valid.
