# Implementation Plan: Operational Data Model

**Branch**: `0.001-operational-data-model` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)  
**Status**: Active

## Summary

Deliver an authoritative DynamoDB single-table schema (`data-model.md`) plus a small shared TypeScript package that implements hostname/fingerprint normalization and key builders with unit tests. No AWS resources are provisioned in this feature (that is 0.002).

## Technical Context

**Language/Version**: TypeScript (Node 20+)  
**Primary Dependencies**: vitest; lightweight IDNA/punycode library if needed (`tr46` / `punycode` evaluation during implementation)  
**Storage**: Schema target = DynamoDB single table `webnotary` (not provisioned here)  
**Testing**: Vitest unit tests for normalize + keys  
**Target Platform**: Shared library consumed by future Lambdas/CLI  
**Project Type**: library  
**Performance Goals**: Key build + normalize in well under 1ms typical  
**Constraints**: No GSI; no unbounded observation rows; constitution trust boundary encoded in docs/types  
**Scale/Scope**: MVP schema only

## Constitution Check

| Gate | Status |
|------|--------|
| IX Version-controlled data model | Pass — schema in repo |
| XXI Client cannot create trust | Pass — field separation + status write rules |
| XXIII Pending dedupe + TTL | Pass — VERIFY keys + expiresAt |
| XXIV Raw evidence not in DynamoDB | Pass — pointer only |
| XV No unnecessary infra in this feature | Pass — docs + library only |

## Project Structure

### Documentation (this feature)

```text
specs/0/0.001-operational-data-model/
├── spec.md
├── plan.md
├── data-model.md
├── research.md
├── tasks.md
├── notes.md
└── manualtester.md
```

### Source Code

```text
packages/data-model/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── normalize.ts
│   └── keys.ts
└── tests/
    ├── normalize.test.ts
    └── keys.test.ts
```

**Structure Decision**: Place the shared contract in `packages/data-model` so API/observer packages can depend on it later without inventing a monorepo-wide `src/` yet.

## Implementation Approach

1. Lock schema text in `data-model.md` (done as part of specify/plan).
2. Implement types mirroring entities/enums.
3. Implement `normalizeHostname`, `normalizeCertificateSha256`.
4. Implement key builders: `hostCertKeys`, `certInventoryKeys`, `pendingVerifyKeys`.
5. Unit test happy paths + rejection cases.
6. Export a clean public API from `index.ts`.

## Complexity Tracking

No constitution violations requiring justification.
