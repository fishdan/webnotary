# Manual Tester: Serverless AWS Foundation

**Status**: Stub

1. `terraform plan` clean against empty/dev account.
2. Apply; confirm DynamoDB, SQS, S3, API GW resources exist.
3. Confirm no VPC/NAT/EC2 created.
4. Confirm IAM policies are least-privilege enough for documented roles.
