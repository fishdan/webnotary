# Manual Tester: Serverless AWS Foundation

**Status**: Data plane applied

## Checklist

- [x] DynamoDB `webnotary-dev-table` (`pk`/`sk`, TTL, PITR)
- [x] SQS verify + DLQ (maxReceiveCount 3)
- [x] S3 evidence private + versioning + HTTPS deny
- [x] HTTP API shell + throttle defaults
- [x] Log groups for future Lambdas
- [x] No IAM roles (deferred)
- [x] No SNS / alarms / budgets
- [x] No VPC/EC2/etc.

```bash
cd infra
terraform plan   # expect no pending IAM creates
terraform output
```
