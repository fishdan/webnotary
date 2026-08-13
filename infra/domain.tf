# Public API custom domain for webnotary.org
#
# SAFETY:
# - Hosted zone is a data source only (Terraform does not own/delete the zone).
# - This file only ADDS certificate, API domain, mapping, and DNS aliases.
# - Do not apply a plan that destroys existing resources.

data "aws_route53_zone" "webnotary" {
  name         = var.public_zone_name
  private_zone = false
}

resource "aws_acm_certificate" "api" {
  domain_name       = var.public_api_hostname
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.webnotary.zone_id
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for r in aws_route53_record.api_cert_validation : r.fqdn]
}

resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = var.public_api_hostname

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.http.id
  domain_name = aws_apigatewayv2_domain_name.api.id
  stage       = aws_apigatewayv2_stage.default.id
}

resource "aws_route53_record" "api_a" {
  zone_id = data.aws_route53_zone.webnotary.zone_id
  name    = var.public_api_hostname
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_aaaa" {
  zone_id = data.aws_route53_zone.webnotary.zone_id
  name    = var.public_api_hostname
  type    = "AAAA"

  alias {
    name                   = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

output "public_api_hostname" {
  value = var.public_api_hostname
}

output "public_check_url" {
  value = "https://${var.public_api_hostname}/v1/check"
}

output "route53_zone_id" {
  value = data.aws_route53_zone.webnotary.zone_id
}
