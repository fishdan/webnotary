resource "aws_cloudwatch_log_group" "lookup" {
  name              = "/aws/lambda/${local.name_prefix}lookup"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "observer" {
  name              = "/aws/lambda/${local.name_prefix}observer"
  retention_in_days = var.log_retention_days
}
