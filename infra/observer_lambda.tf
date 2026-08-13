data "archive_file" "observer_lambda" {
  type        = "zip"
  source_file = "${path.module}/../packages/verification-worker/dist/handler.js"
  output_path = "${path.module}/build/observer-handler.zip"
}

resource "aws_iam_role" "observer" {
  name               = "${local.name_prefix}observer-role"
  assume_role_policy = data.aws_iam_policy_document.lookup_assume.json
}

data "aws_iam_policy_document" "observer" {
  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.observer.arn}:*"]
  }

  statement {
    sid    = "ConsumeVerificationQueue"
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility",
    ]
    resources = [aws_sqs_queue.verify.arn]
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
    sid     = "WriteEvidenceObjects"
    effect  = "Allow"
    actions = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.evidence.arn}/*"]
  }
}

resource "aws_iam_role_policy" "observer" {
  name   = "${local.name_prefix}observer-policy"
  role   = aws_iam_role.observer.id
  policy = data.aws_iam_policy_document.observer.json
}

resource "aws_lambda_function" "observer" {
  function_name = "${local.name_prefix}observer"
  role          = aws_iam_role.observer.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  architectures = ["x86_64"]
  timeout       = 55
  memory_size   = 512

  filename         = data.archive_file.observer_lambda.output_path
  source_code_hash = data.archive_file.observer_lambda.output_base64sha256

  environment {
    variables = {
      TABLE_NAME      = aws_dynamodb_table.webnotary.name
      EVIDENCE_BUCKET = aws_s3_bucket.evidence.bucket
      OBSERVER_ID     = "aws-lambda-observer"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.observer,
    aws_iam_role_policy.observer,
  ]
}

resource "aws_lambda_event_source_mapping" "verify_queue" {
  event_source_arn = aws_sqs_queue.verify.arn
  function_name    = aws_lambda_function.observer.arn
  batch_size       = 1
  enabled          = true
}

output "observer_function_name" {
  value = aws_lambda_function.observer.function_name
}

output "observer_role_arn" {
  value = aws_iam_role.observer.arn
}
