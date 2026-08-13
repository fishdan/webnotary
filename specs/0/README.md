# SpecKit Release 0 Index

Stub specifications for WebNotary release 0. Detail via SpecKit workflows before implementation.

| Spec | Directory | Branch | Depends on |
|------|-----------|--------|------------|
| Operational data model | `0.001-operational-data-model` | `0.001-operational-data-model` | — |
| Serverless AWS foundation | `0.002-serverless-aws-foundation` | `0.002-serverless-aws-foundation` | 0.001 |
| Lookup API | `0.003-lookup-api` | `0.003-lookup-api` | 0.001, 0.002 |
| TLS observer | `0.004-tls-observer` | `0.004-tls-observer` | soft: 0.002 |
| Verification orchestration | `0.005-verification-orchestration` | `0.005-verification-orchestration` | 0.001–0.004 |
| CT inventory pipeline | `0.006-ct-inventory-pipeline` | `0.006-ct-inventory-pipeline` | 0.001 |
| CT gate + trust policy | `0.007-ct-gate-and-trust-policy` | `0.007-ct-gate-and-trust-policy` | 0.005, 0.006 |
| Chrome extension | `0.008-chrome-extension` | `0.008-chrome-extension` | backend E2E |
| Public API custom domain | `0.009-api-custom-domain` | `0.009-api-custom-domain` | 0.002–0.003, Route53 zone |

Product source of truth for intent: `/webnotary.md`  
Engineering law: `/.specify/memory/constitution.md`
