# Infrastructure Design: Serverless AWS Foundation (MVP)

**Spec**: [spec.md](./spec.md)  
**Status**: Active — implementing with locked decisions in `research.md`  
**Depends on**: `specs/0/0.001-operational-data-model/data-model.md`

This document is the authoritative infra design for 0.002. Terraform MUST follow it.

---

## Environment model

| Item | MVP choice |
|------|------------|
| Environments | `dev` only in this feature |
| Layout | `infra/` root module + `infra/envs/dev/` (or `infra/dev/`) thin env wrapper |
| State | **Local** Terraform state for MVP (remote state later) |
| Default region | `us-east-1` (variable) |
| Name prefix | `${project}-${env}-` with defaults `project=webnotary`, `env=dev` |

Example resource names:

```text
webnotary-dev-table
webnotary-dev-verify
webnotary-dev-verify-dlq
webnotary-dev-evidence
webnotary-dev-http-api
webnotary-dev-lookup-role
webnotary-dev-observer-role
```

---

## Resource inventory

### 1. DynamoDB — operational table

| Setting | Value |
|---------|-------|
| Name | `${prefix}table` (logical product name still `webnotary`) |
| Hash key | `pk` (S) |
| Range key | `sk` (S) |
| Billing | `PAY_PER_REQUEST` |
| TTL | Enabled on attribute `expiresAt` |
| Streams | Off (MVP) |
| GSIs | None |
| PITR | Enabled |
| Encryption | AWS owned key (SSE) sufficient for MVP; CMK optional later |
| Deletion protection | Off for `dev`; document On for future `prod` |

No attribute definitions beyond keys (DynamoDB schemaless).

### 2. SQS — verification queue + DLQ

| Setting | Value |
|---------|-------|
| Main queue | `${prefix}verify` (Standard) |
| DLQ | `${prefix}verify-dlq` (Standard) |
| maxReceiveCount | `3` |
| Visibility timeout | `60` seconds (enough headroom for TLS observe; tune in 0.005) |
| Message retention | Main 4 days; DLQ 14 days |
| Encryption | SSE-SQS (AWS managed) |

**Message body shape** is owned by 0.005; infra only creates queues.

### 3. S3 — evidence bucket

| Setting | Value |
|---------|-------|
| Name | Globally unique: `${prefix}evidence-${account_id}` (or random suffix) |
| Public access block | All four settings **true** |
| Versioning | Enabled |
| Encryption | SSE-S3 (`AES256`) default; bucket policy deny `aws:SecureTransport=false` |
| Lifecycle | Optional: abort incomplete multipart after 7 days |
| Object ownership | BucketOwnerEnforced |

Non-normative key prefix (0.005 owns final layout):

```text
observations/year=YYYY/month=MM/day=DD/hour=HH/...
```

### 4. API Gateway HTTP API

| Setting | Value |
|---------|-------|
| Type | HTTP API (not REST API) |
| Name | `${prefix}http-api` |
| Stage | `$default` auto-deploy |
| CORS | Deferred unless needed for browser calls from extension/origin testing; document default off |
| Routes | None required in 0.002 (0.003 adds `POST /v1/check`) |
| Throttle (stage default) | Burst `100`, rate `50` req/s (conservative MVP; variables) |
| Access logs | Optional MVP; if enabled, CloudWatch log group with 30-day retention |

Custom domain: **out of scope** (use `https://{api-id}.execute-api.{region}.amazonaws.com`).

### 5. IAM roles — deferred

**Not created in 0.002.** Deploy user may lack `iam:CreateRole`; roles will be added with the first Lambda (0.003 lookup / 0.005 observer).

Recommended future least-privilege matrix (for those specs):

#### Lookup role (future)

Trust: `lambda.amazonaws.com`

| Action | Resource |
|--------|----------|
| `logs:CreateLogStream`, `PutLogEvents` | log group `/aws/lambda/${prefix}lookup*` |
| `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query` | table ARN (+ index ARN pattern if GSIs appear later) |
| `sqs:SendMessage`, `GetQueueAttributes`, `GetQueueUrl` | verify queue ARN |

#### Observer role (future)

Trust: `lambda.amazonaws.com`

| Action | Resource |
|--------|----------|
| CloudWatch logs | `/aws/lambda/${prefix}observer*` |
| `sqs:ReceiveMessage`, `DeleteMessage`, `GetQueueAttributes`, `ChangeMessageVisibility` | verify queue ARN |
| `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query` | table ARN |
| `s3:PutObject`, `AbortMultipartUpload`, `ListBucket` | evidence bucket / objects |

#### Placeholder log groups (created in 0.002)

Retention **30 days**:

- `/aws/lambda/${prefix}lookup`
- `/aws/lambda/${prefix}observer`

### 6. Alarms & budget

**Deferred in 0.002** (human decision: no alerts now). Do not create SNS topics, CloudWatch metric alarms, or AWS Budgets in this feature. Add before broad public testing.

### 7. Explicitly not created

- VPC, subnets, NAT, IGW, security groups
- EC2, ECS, EKS, App Runner, Elastic Beanstalk
- ALB/NLB, API Gateway REST API (v1)
- Route53 zones, ACM certs, CloudFront distributions
- Cognito / WAF
- SNS / CloudWatch alarms / AWS Budgets (deferred)
- Lambda function resources (code deploy later)
- Lambda IAM roles/policies (deferred to 0.003 / 0.005)
- Event source mappings (0.005)

---

## Terraform layout

```text
infra/
  README.md
  versions.tf
  providers.tf
  variables.tf
  outputs.tf
  dynamodb.tf
  sqs.tf
  s3.tf
  apigateway.tf
  logging.tf              # log groups only (no alarms)
  terraform.tfvars.example
```

Flat root module. Local state file (gitignored). No remote backend in 0.002.

---

## Outputs (required)

```text
aws_region
dynamodb_table_name
dynamodb_table_arn
verify_queue_url
verify_queue_arn
verify_dlq_url
verify_dlq_arn
evidence_bucket_name
evidence_bucket_arn
http_api_id
http_api_endpoint
```

---

## Credentials & secrets

- Never commit keys.
- Document loading from `.secrets/aws.keys` (or standard `AWS_PROFILE`) into environment before plan/apply.
- `terraform.tfvars` with emails/account-specific values is gitignored; provide `.example`.

---

## Apply / destroy notes

1. `cd infra` (or env dir)
2. Export credentials
3. `terraform init`
4. `terraform plan`
5. `terraform apply`
6. Destroy: empty evidence bucket (versions!) before destroy, or use `force_destroy=true` **only** for `dev` (variable default true in dev, false otherwise)
