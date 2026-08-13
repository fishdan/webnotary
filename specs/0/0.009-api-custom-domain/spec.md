# Feature Specification: Public API Custom Domain

**Feature Branch**: `0.009-api-custom-domain`  
**Created**: 2026-08-13  
**Status**: Active  
**Source**: `webnotary.md` § AWS MVP Architecture (API)

## Intent

Expose the existing HTTP API at `https://api.webnotary.org` using the already-created Route53 hosted zone for `webnotary.org`, without deleting or replacing any existing AWS resources.

## In Scope

- ACM certificate (DNS-validated) for `api.webnotary.org` in `us-east-1`
- API Gateway HTTP API custom domain + stage mapping to existing `$default` stage
- Route53 alias records (A/AAAA) for `api.webnotary.org`
- Terraform safety: manage zone via **data source only**; apply only when plan has **zero destroys**

## Out of Scope

- Apex / `www` marketing site (CloudFront + S3)
- Changing API routes or Lambda behavior
- Importing or replacing the hosted zone resource
- `terraform destroy` / deleting DynamoDB, SQS, S3, Lambdas, or the HTTP API

## Key Requirements

- R1: Existing `webnotary.org` zone remains outside Terraform ownership (data source)
- R2: Custom domain is additive only
- R3: `/v1/check` works at `https://api.webnotary.org/v1/check`
- R4: Apply aborted if plan includes any destroy actions

## Dependencies

- Requires: 0.002 HTTP API, 0.003 lookup route, live Route53 zone `webnotary.org`
