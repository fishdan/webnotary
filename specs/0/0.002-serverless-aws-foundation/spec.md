# Feature Specification: Serverless AWS Foundation

**Feature Branch**: `0.002-serverless-aws-foundation`  
**Created**: 2026-08-13  
**Status**: Stub  
**Source**: `webnotary.md` § AWS MVP Architecture, Step 2

## Intent

Provision the lightest practical serverless AWS footprint via Terraform for WebNotary MVP.

## In Scope

- DynamoDB tables (per 0.001 design)
- SQS verification queue + DLQ
- Lambda IAM roles/policies (stubs/roles ready for 0.003–0.005)
- API Gateway HTTP API shell
- S3 observation/evidence bucket
- CloudWatch logs + basic alarms / billing alert hooks
- Route 53 / ACM only as needed for API/site later

## Out of Scope

- EC2, ECS, nginx, App Runner, VPC, NAT, load balancers
- Application business logic
- Chrome extension hosting details
- Full public website content

## Key Requirements

- Infrastructure as code; no manual prod drift
- Least privilege IAM
- Constitution XV: serverless preference

## User Stories (stub)

### US1 — Core data plane (P1)

Engineer can apply Terraform and obtain DynamoDB + S3 + SQS ready for app wiring.

### US2 — API shell (P1)

HTTP API exists and can later attach the lookup Lambda.

### US3 — Operational alarms (P2)

Basic failure/throttle/billing signals exist before public testing.

## Dependencies

- Requires: 0.001 design accepted (keys/attributes)
- Enables: 0.003, 0.005
