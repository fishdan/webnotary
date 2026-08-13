data "archive_file" "lookup_lambda" {
  type        = "zip"
  source_file = "${path.module}/../packages/lookup-api/dist/handler.js"
  output_path = "${path.module}/build/lookup-handler.zip"
}

data "aws_iam_policy_document" "lookup_assume" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lookup" {
  name               = "${local.name_prefix}lookup-role"
  assume_role_policy = data.aws_iam_policy_document.lookup_assume.json
}

data "aws_iam_policy_document" "lookup" {
  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.lookup.arn}:*"]
  }

  statement {
    sid    = "DynamoDBAccess"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
    ]
    resources = [aws_dynamodb_table.webnotary.arn]
  }

  statement {
    sid    = "SendVerificationJobs"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
    ]
    resources = [aws_sqs_queue.verify.arn]
  }
}

resource "aws_iam_role_policy" "lookup" {
  name   = "${local.name_prefix}lookup-policy"
  role   = aws_iam_role.lookup.id
  policy = data.aws_iam_policy_document.lookup.json
}

resource "aws_lambda_function" "lookup" {
  function_name = "${local.name_prefix}lookup"
  role          = aws_iam_role.lookup.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  architectures = ["x86_64"]
  timeout       = 10
  memory_size   = 256

  filename         = data.archive_file.lookup_lambda.output_path
  source_code_hash = data.archive_file.lookup_lambda.output_base64sha256

  environment {
    variables = {
      TABLE_NAME       = aws_dynamodb_table.webnotary.name
      VERIFY_QUEUE_URL = aws_sqs_queue.verify.url
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lookup,
    aws_iam_role_policy.lookup,
  ]
}

resource "aws_apigatewayv2_integration" "lookup" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.lookup.invoke_arn
  payload_format_version = "2.0"
  integration_method     = "POST"
}

resource "aws_apigatewayv2_route" "check" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /v1/check"
  target    = "integrations/${aws_apigatewayv2_integration.lookup.id}"
}

resource "aws_lambda_permission" "allow_http_api" {
  statement_id  = "AllowHTTPAPIInvokeLookup"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lookup.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*/v1/check"
}

output "lookup_function_name" {
  value = aws_lambda_function.lookup.function_name
}

output "lookup_role_arn" {
  value = aws_iam_role.lookup.arn
}

output "check_url" {
  value = "${aws_apigatewayv2_api.http.api_endpoint}/v1/check"
}
