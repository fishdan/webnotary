# Implementation Plan: Serverless AWS Foundation

**Branch**: `0.002-serverless-aws-foundation` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Applied (IAM deferred)

## Summary

Flat `infra/` Terraform module with **local state**, default region `us-east-1`, API throttle 50/100, **no alerts**, and **no IAM roles**. Provisions DynamoDB (0.001), SQS+DLQ, evidence S3, HTTP API shell, and future Lambda log groups.

## Locked decisions

See [research.md](./research.md).

## Constitution Check

| Gate | Status |
|------|--------|
| IX Version-controlled infra | Pass |
| XV Serverless / no VPC | Pass |
| XVI Least privilege | Deferred with roles to app specs |
| XXIII Cost/abuse alarms | Deferred by human for 0.002 |
| XXIV Evidence in S3 | Pass |

## Current deploy status

Applied in `dev`: table, queues, bucket, HTTP API, log groups. IAM intentionally out of scope for 0.002.
