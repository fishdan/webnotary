# Tasks: Public API Custom Domain

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)  
**Status**: Complete  
**Branch**: `0.009-api-custom-domain`

**Goal**: Serve the existing lookup API at `https://api.webnotary.org/v1/check` using Terraform add-only changes against the existing `webnotary.org` Route53 zone — never deleting AWS resources.

---

## Phase 1: Spec & safety

- [x] T001 SpecKit for domain cutover; document destroy-guard rule in `infra/README.md`
- [x] T002 Confirm zone `webnotary.org` via data source (zone id `Z04744473EHTVEIU29759`)

## Phase 2: Terraform (add-only)

- [x] T003 Add `infra/domain.tf`: ACM, validation records, API domain name, API mapping, Route53 A/AAAA aliases for `api.webnotary.org`
- [x] T004 Variables/outputs for public API hostname; set `evidence_force_destroy` default to `false`
- [x] T005 Add `lifecycle.prevent_destroy = true` on critical existing resources (table, queues, evidence bucket, HTTP API, Lambdas)

## Phase 3: Apply & validate

- [x] T006 `terraform plan` — abort if any destroy actions (**0 destroyed**)
- [x] T007 `terraform apply` when plan is create/update-only (**7 added, 1 changed, 0 destroyed**)
- [x] T008 Smoke `POST https://api.webnotary.org/v1/check` → `valid` / `unknown`; update progress.ai; PR when requested
