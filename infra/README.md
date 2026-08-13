# WebNotary AWS infrastructure

Flat Terraform root module. **Local state** (no remote backend yet).

## Safety: no deletes

Terraform changes for WebNotary must be **add/update only**.

Before every apply:

```bash
cd infra
terraform plan -out=tfplan
# Fail if any destroy/replace is planned:
terraform show -json tfplan | python3 -c '
import json,sys
p=json.load(sys.stdin)
bad=[]
for c in p.get("resource_changes",[]):
  acts=c.get("change",{}).get("actions",[])
  if "delete" in acts or acts==["create","delete"] or acts==["delete","create"]:
    bad.append((c["address"], acts))
if bad:
  print("REFUSING APPLY — destroy/replace planned:")
  for a,acts in bad: print(" ", a, acts)
  sys.exit(1)
print("OK: no destroy/replace actions")
'
terraform apply tfplan   # only if the check passed
```

Critical resources use `lifecycle.prevent_destroy = true`. The `webnotary.org` hosted zone is a **data source** only (never created/destroyed by this stack).

## Prerequisites

- Terraform >= 1.5
- AWS credentials (Albert) with API Gateway, ACM, Route53 record, Lambda, DynamoDB, SQS, S3 permissions
- Existing Route53 hosted zone for `webnotary.org`

## Usage

```bash
cd infra
terraform init
terraform plan -out=tfplan
# run destroy-guard above
terraform apply tfplan
terraform output
```

## Public API domain (0.009)

- Hostname: `api.webnotary.org`
- Check URL: `https://api.webnotary.org/v1/check`
- ACM DNS validation + API Gateway custom domain + Route53 A/AAAA aliases

## What exists

- DynamoDB, SQS verify+DLQ, evidence S3, HTTP API
- Lookup / observer / CT-ingest Lambdas
- Custom domain `api.webnotary.org`

## Explicitly not created here

- VPC / EC2 / ECS / ALB / NAT
- Apex/`www` CloudFront website (deferred)
- SNS / CloudWatch alarms / AWS Budgets
- Ownership of the Route53 hosted zone itself

# Lambda builds before apply

```bash
cd packages/lookup-api && npm ci && npm test && npm run build
cd ../verification-worker && npm ci && npm test && npm run build
cd ../ct-ingest && npm ci && npm test && npm run build
cd ../../infra && terraform apply
```
