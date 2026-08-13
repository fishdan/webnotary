# WebNotary AWS foundation (feature 0.002)

Flat Terraform root module. **Local state** (no remote backend yet). **No alerts** in this feature.

## Prerequisites

- Terraform >= 1.5
- AWS credentials with permission to create DynamoDB, SQS, S3, API Gateway, CloudWatch Logs
- IAM role creation is **not** required for this feature

Load credentials without committing them. Example if using `.secrets/aws.keys`:

```bash
# Parse locally; do not echo secrets
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1
```

Or use a named profile: `export AWS_PROFILE=webnotary`.

## Usage

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # optional overrides
terraform init
terraform plan
terraform apply
terraform output
```

## What this creates

- DynamoDB `${project}-${env}-table` (`pk`/`sk`, On-Demand, TTL `expiresAt`, PITR)
- SQS verify queue + DLQ
- Private evidence S3 bucket
- HTTP API shell (throttle defaults 50 rps / burst 100; routes added in 0.003)
- CloudWatch log groups for future lookup/observer functions

## Explicitly not created

- VPC / EC2 / ECS / ALB / NAT
- Route53 / ACM / CloudFront
- Lambda function code
- Lambda IAM roles/policies (deferred to 0.003 / 0.005)
- SNS / CloudWatch alarms / AWS Budgets

## Destroy (dev)

Evidence bucket has `force_destroy=true` by default for `dev` so destroy can remove objects/versions.

```bash
terraform destroy
```
