# Implementation Plan: CT Inventory Pipeline

**Branch**: `0.006-ct-inventory-pipeline` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Stub

## Summary

Standalone CT ingestion/normalization job writing certificate inventory only.

## Technical Context

**Storage**: DynamoDB inventory (and optional DER in S3 if retained)  
**Compute**: TBD serverless worker/schedule  
**Constraints**: Must not couple to API latency path

## Constitution Check

- [ ] XXI CT ≠ trust
- [ ] XXIV separate collection from serving

## Open Questions

- Which CT logs / operators for MVP
- Full DER retention vs fingerprint+metadata only

## Next

Full `/speckit-plan` when starting 0.006.
