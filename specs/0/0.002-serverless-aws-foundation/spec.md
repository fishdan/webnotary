# Feature Specification: Serverless AWS Foundation

**Feature Branch**: `0.002-serverless-aws-foundation`  
**Created**: 2026-08-13  
**Status**: Specified / implementing (decisions locked; see `research.md`)  
**Source**: `webnotary.md` § AWS MVP Architecture, Step 2; Constitution IX, XV, XVI, XXIII  
**Depends on**: `0.001-operational-data-model` (`data-model.md`)

## Intent

Provision the lightest practical AWS serverless foundation with Terraform so 0.003 (lookup API) and 0.005 (verification orchestration) can attach application code without inventing infrastructure ad hoc.

This feature creates **infrastructure only** — no business logic Lambdas, no CT ingest, no website content.

## In Scope

- Terraform project under `infra/` for a single MVP environment (`dev` first)
- DynamoDB table `webnotary` per 0.001 (`pk`/`sk`, On-Demand, TTL on `expiresAt`)
- SQS verification queue + dead-letter queue
- Private encrypted S3 bucket for observation/evidence objects
- API Gateway **HTTP API** shell (stage + throttling defaults; routes wired in 0.003)
- CloudWatch log groups (placeholder retention) for future Lambdas
- Documented `plan` / `apply` / `destroy` workflow using credentials from `.secrets/` (never committed)
- Terraform outputs consumed by later app wiring
- **Local** Terraform state for MVP

## Out of Scope

- EC2, ECS, nginx, App Runner, VPC, NAT Gateway, load balancers, Elastic IPs
- Implementing lookup or observer Lambda **code** (0.003 / 0.004 / 0.005)
- **IAM roles for Lambdas** (deferred to 0.003 / 0.005 when functions are introduced; avoids needing `iam:CreateRole` now)
- SQS → Lambda event source mapping until observer code exists (document hook; optional stub resource deferred to 0.005)
- Custom domain / Route 53 / ACM for `api.webnotary.org` (defer until DNS cutover; use execute-api URL for MVP)
- CloudFront + static marketing site
- Production multi-account / multi-region layout
- CT ingestion compute (0.006)
- WAF (revisit before broad public launch)

## User Scenarios & Testing

### User Story 1 — Data plane ready (Priority: P1)

An engineer applies Terraform and gets a usable DynamoDB table, evidence bucket, and verification queue/DLQ.

**Why this priority**: Blocks every later backend feature.

**Independent Test**: `terraform apply` succeeds; AWS console/CLI shows table, bucket, queues; outputs printed.

**Acceptance Scenarios**:

1. **Given** valid AWS credentials and `infra/dev` (or equivalent) vars, **When** `terraform apply` runs, **Then** DynamoDB table exists with `pk`/`sk` keys, PAY_PER_REQUEST, and TTL enabled on `expiresAt`.
2. **Given** apply succeeded, **When** inspecting SQS, **Then** a main verification queue and DLQ exist with redrive policy configured.
3. **Given** apply succeeded, **When** inspecting S3, **Then** the evidence bucket blocks public access, uses SSE, and denies unencrypted puts (via bucket policy or encryption config).

---

### User Story 2 — API shell ready (Priority: P1)

An engineer has an HTTP API endpoint URL ready for 0.003 to attach `POST /v1/check`.

**Why this priority**: Lookup needs a stable front door.

**Independent Test**: API stage invoke URL is in Terraform outputs; default route may 404 until 0.003.

**Acceptance Scenarios**:

1. **Given** apply succeeded, **When** reading outputs, **Then** `http_api_endpoint` (or equivalent) is non-empty.
2. **Given** the HTTP API, **When** reviewing throttling config, **Then** stage-level throttle limits are set to conservative MVP defaults (exact numbers in `infrastructure.md`).

---

### User Story 3 — Least-privilege compute identities (Priority: P1)

**Deferred to 0.003 / 0.005.** Lambda IAM roles are not created in 0.002 so constrained deploy users (no `iam:CreateRole`) can still provision the data plane.

---

### User Story 4 — Cost and failure signals (Priority: P2)

**Deferred.** No SNS, CloudWatch alarms, or AWS Budgets in 0.002 (human decision). Revisit before public testing.

### Edge Cases

- Re-apply is idempotent (no destroy/recreate of table/bucket unless forced).
- Destroy in `dev` is allowed and documented; production destroy requires explicit human approval (future env).
- Missing AWS credentials fail fast with clear docs — no secrets in repo.
- Accidental public S3 ACL attempts are blocked by Public Access Block.

## Requirements

### Functional Requirements

- **FR-001**: Infrastructure MUST be defined in Terraform and checked into the repository.
- **FR-002**: MVP MUST provision exactly one operational DynamoDB table matching 0.001 key schema (`pk` S, `sk` S) with On-Demand capacity and TTL on `expiresAt`.
- **FR-003**: MVP MUST NOT create GSIs.
- **FR-004**: MVP MUST provision an SQS standard queue for verification jobs and a DLQ with maxReceiveCount ≤ 3 (exact value in `infrastructure.md`).
- **FR-005**: MVP MUST provision a private S3 bucket for evidence with encryption at rest, Block Public Access enabled, and versioning enabled for MVP safety.
- **FR-006**: MVP MUST provision an API Gateway HTTP API with a default stage and conservative throttle settings.
- **FR-007**: MVP MUST NOT create Lambda IAM roles in 0.002; roles/policies are deferred to 0.003 / 0.005 when functions are introduced.
- **FR-008**: MVP MUST create CloudWatch log groups for future lookup/observer Lambdas with retention (30 days). Metric alarms, SNS, and AWS Budgets are **out of scope for 0.002**.
- **FR-009**: *(Reserved / deferred)* Cost and failure alerting will be added in a later hardening feature before broad public testing.
- **FR-010**: Terraform MUST emit outputs: table name/arn, queue URL/arn, DLQ URL/arn, bucket name/arn, HTTP API endpoint/id, AWS region.
- **FR-011**: Stack MUST NOT create VPC, NAT, EC2, ECS, ALB, or similar prohibited resources.
- **FR-012**: Custom domain / Route53 / ACM / CloudFront website MUST be deferred (documented non-goal for this feature).
- **FR-013**: Naming MUST use a configurable project prefix + environment (e.g. `webnotary-dev-...`) to avoid collisions.
- **FR-014**: Docs MUST describe using local credentials (e.g. `.secrets/aws.keys` loaded into env) without committing secrets.
- **FR-015**: Point-in-time recovery (PITR) SHOULD be enabled on DynamoDB for MVP (low cost insurance).

### Key Entities (AWS resources)

- **WebNotaryTable** — operational single-table store
- **VerificationQueue** / **VerificationDLQ** — async observer work
- **EvidenceBucket** — immutable/raw observation objects
- **HttpApi** — public API front door shell
- **LookupRole** / **ObserverRole** — deferred to 0.003 / 0.005
- **OpsAlarms** / **MonthlyBudget** — deferred (not in 0.002)

## Success Criteria

- **SC-001**: Reviewer can understand every resource from `infrastructure.md` + `spec.md` without chat history.
- **SC-002**: `terraform plan` in a clean env shows only serverless resources listed in scope (no VPC/EC2/etc.).
- **SC-003**: Apply completes in a developer AWS account without manual console clicking (aside from optional SNS email confirm / budget email confirm).
- **SC-004**: `terraform plan` after apply is clean (no pending IAM role creates).
- **SC-005**: Destroy of the `dev` stack is documented and leaves no undeclared leftovers (acknowledge S3 may need empty-bucket handling).

## Assumptions

- AWS single account/region (`us-east-1` default).
- Local Terraform state for this feature.
- No alert email / SNS / budgets in 0.002.
- Application packaging/deploy of Lambdas is owned by 0.003/0.005; this feature only prepares roles and related infra.

## Dependencies

- **Requires**: 0.001 merged (`data-model.md` authoritative).
- **Enables**: 0.003, 0.005 (and supports 0.004 deploy packaging later).
- **Soft parallel**: 0.006 may need additional IAM/buckets later — do not block 0.002 on CT.
