# Research: Verification Orchestration

## Interim: enqueue without CT

Accepted risk until 0.006/0.007: unknown fingerprints trigger hostname observation, capped by pending dedupe.

## SINGLE_OBSERVED on tlsValid only

Invalid PKI still stores S3 evidence but does not grant SINGLE_OBSERVED.

## Client FP vs observed FP

Mismatch recorded in evidence JSON; trust attaches to observed cert only.
