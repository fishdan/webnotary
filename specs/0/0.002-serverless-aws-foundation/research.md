# Research: Serverless AWS Foundation

**Feature**: 0.002-serverless-aws-foundation  
**Date**: 2026-08-13

## Locked decisions (human)

| Question | Decision |
|----------|----------|
| Default region | `us-east-1` |
| Terraform state | **Local** for first apply (remote state later) |
| Alerts / SNS / Budget | **None in 0.002** |
| API throttle defaults | 50 RPS / burst 100 |
| Layout | Flat `infra/` root module |
| IAM roles | **Deferred** to 0.003 / 0.005 (no new roles/users now; Albert stays constrained) |

## Decision: Flat Terraform root module for MVP

**Choice**: Single `infra/` module with tfvars.

## Decision: Defer custom domain / website

**Choice**: No Route53/ACM/CloudFront in 0.002.

## Decision: Defer IAM roles until Lambdas exist

**Choice**: Do not create lookup/observer roles in 0.002.

**Rationale**: Deploy principal cannot `iam:CreateRole`; no need for a new user/role yet. App specs will create least-privilege roles when functions are introduced. Permission matrix kept in `infrastructure.md` as guidance.

## Decision: Standard SQS (not FIFO)

**Choice**: Standard queue; dedupe lives in DynamoDB pending items.

## Decision: `force_destroy` on evidence bucket for `dev` only

**Choice**: Variable default `true` for this MVP stack.

## Decision: PITR on DynamoDB

**Choice**: Enabled.

## Decision: No ops alerts in 0.002

**Choice**: Skip SNS, CloudWatch metric alarms, and AWS Budgets for now.
