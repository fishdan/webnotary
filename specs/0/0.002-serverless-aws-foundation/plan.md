# Implementation Plan: Serverless AWS Foundation

**Branch**: `0.002-serverless-aws-foundation` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Stub

## Summary

Terraform modules/stack for DynamoDB, SQS/DLQ, S3 evidence, API Gateway HTTP API, Lambda roles, CloudWatch.

## Technical Context

**IaC**: Terraform  
**Cloud**: AWS serverless  
**Constraints**: No VPC unless later specified

## Constitution Check

- [ ] IX version-controlled infra
- [ ] XV no unnecessary persistent compute
- [ ] XVI least privilege

## Open Questions

- AWS account/region for MVP
- Naming/prefix conventions
- Whether website (CloudFront+S3) is in this stack or deferred

## Next

Full `/speckit-plan` when starting 0.002 after 0.001.
