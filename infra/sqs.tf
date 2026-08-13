resource "aws_sqs_queue" "verify_dlq" {
  name                      = "${local.name_prefix}verify-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_sqs_queue" "verify" {
  name                       = "${local.name_prefix}verify"
  visibility_timeout_seconds = var.verify_visibility_timeout_seconds
  message_retention_seconds  = 345600 # 4 days
  sqs_managed_sse_enabled     = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.verify_dlq.arn
    maxReceiveCount     = var.verify_max_receive_count
  })

  lifecycle {
    prevent_destroy = true
  }
}
