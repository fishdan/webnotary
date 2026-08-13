output "aws_region" {
  value = var.aws_region
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.webnotary.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.webnotary.arn
}

output "verify_queue_url" {
  value = aws_sqs_queue.verify.url
}

output "verify_queue_arn" {
  value = aws_sqs_queue.verify.arn
}

output "verify_dlq_url" {
  value = aws_sqs_queue.verify_dlq.url
}

output "verify_dlq_arn" {
  value = aws_sqs_queue.verify_dlq.arn
}

output "evidence_bucket_name" {
  value = aws_s3_bucket.evidence.bucket
}

output "evidence_bucket_arn" {
  value = aws_s3_bucket.evidence.arn
}

output "http_api_id" {
  value = aws_apigatewayv2_api.http.id
}

output "http_api_endpoint" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

# IAM roles intentionally deferred to 0.003 / 0.005 (when Lambdas are introduced).
