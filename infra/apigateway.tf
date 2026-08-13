resource "aws_apigatewayv2_api" "http" {
  name          = "${local.name_prefix}http-api"
  protocol_type = "HTTP"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.http_api_throttle_burst_limit
    throttling_rate_limit  = var.http_api_throttle_rate_limit
  }
}
