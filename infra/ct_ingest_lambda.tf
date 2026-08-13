resource "aws_cloudwatch_log_group" "ct_ingest" {
  name              = "/aws/lambda/${local.name_prefix}ct-ingest"
  retention_in_days = 14
}

data "archive_file" "ct_ingest_lambda" {
  type        = "zip"
  source_file = "${path.module}/../packages/ct-ingest/dist/handler.js"
  output_path = "${path.module}/build/ct-ingest-handler.zip"
}

resource "aws_iam_role" "ct_ingest" {
  name               = "${local.name_prefix}ct-ingest-role"
  assume_role_policy = data.aws_iam_policy_document.lookup_assume.json
}

data "aws_iam_policy_document" "ct_ingest" {
  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.ct_ingest.arn}:*"]
  }

  statement {
    sid    = "DynamoDBInventory"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = [aws_dynamodb_table.webnotary.arn]
  }
}

resource "aws_iam_role_policy" "ct_ingest" {
  name   = "${local.name_prefix}ct-ingest-policy"
  role   = aws_iam_role.ct_ingest.id
  policy = data.aws_iam_policy_document.ct_ingest.json
}

resource "aws_lambda_function" "ct_ingest" {
  function_name = "${local.name_prefix}ct-ingest"
  role          = aws_iam_role.ct_ingest.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  architectures = ["x86_64"]
  timeout       = 120
  memory_size   = 512

  filename         = data.archive_file.ct_ingest_lambda.output_path
  source_code_hash = data.archive_file.ct_ingest_lambda.output_base64sha256

  environment {
    variables = {
      TABLE_NAME             = aws_dynamodb_table.webnotary.name
      CT_SEED_HOSTNAMES      = "example.com"
      CT_MAX_CERTS_PER_HOST  = "20"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.ct_ingest,
    aws_iam_role_policy.ct_ingest,
  ]
}

resource "aws_cloudwatch_event_rule" "ct_ingest_daily" {
  name                = "${local.name_prefix}ct-ingest-daily"
  description         = "Daily CT inventory seed walk"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "ct_ingest_daily" {
  rule      = aws_cloudwatch_event_rule.ct_ingest_daily.name
  target_id = "ct-ingest"
  arn       = aws_lambda_function.ct_ingest.arn
}

resource "aws_lambda_permission" "ct_ingest_events" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ct_ingest.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ct_ingest_daily.arn
}

output "ct_ingest_function_name" {
  value = aws_lambda_function.ct_ingest.function_name
}

output "ct_ingest_role_arn" {
  value = aws_iam_role.ct_ingest.arn
}
