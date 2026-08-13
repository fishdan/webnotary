# Implementation Plan: Public API Custom Domain

**Branch**: `0.009-api-custom-domain` | **Spec**: [spec.md](./spec.md)

## Approach

1. `data.aws_route53_zone.webnotary` for `webnotary.org` (never create/destroy zone)
2. ACM cert + DNS validation CNAMEs in that zone
3. `aws_apigatewayv2_domain_name` + `aws_apigatewayv2_api_mapping` → existing API/`$default`
4. Alias A + AAAA for `api.webnotary.org`
5. `terraform plan` → reject if any resource change includes `delete`
6. Smoke POST `/v1/check`

## Non-goals

Website, CloudFront, apex records.
