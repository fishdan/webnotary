variable "aws_region" {
  type        = string
  description = "AWS region for MVP resources"
  default     = "us-east-1"
}

variable "project" {
  type        = string
  description = "Project name used in resource name prefixes"
  default     = "webnotary"
}

variable "environment" {
  type        = string
  description = "Environment name (dev for MVP)"
  default     = "dev"
}

variable "http_api_throttle_burst_limit" {
  type        = number
  description = "API Gateway HTTP API stage burst limit"
  default     = 100
}

variable "http_api_throttle_rate_limit" {
  type        = number
  description = "API Gateway HTTP API stage steady-state rate limit (req/s)"
  default     = 50
}

variable "verify_visibility_timeout_seconds" {
  type        = number
  description = "SQS visibility timeout for verification workers"
  default     = 60
}

variable "verify_max_receive_count" {
  type        = number
  description = "Receives before a message is sent to the DLQ"
  default     = 3
}

variable "evidence_force_destroy" {
  type        = bool
  description = "Allow terraform destroy to delete non-empty evidence bucket (keep false — never delete WebNotary data)"
  default     = false
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention for future Lambda log groups"
  default     = 30
}

locals {
  name_prefix = "${var.project}-${var.environment}-"
}
