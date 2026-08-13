variable "public_api_hostname" {
  type        = string
  description = "Public hostname for the HTTP API custom domain"
  default     = "api.webnotary.org"
}

variable "public_zone_name" {
  type        = string
  description = "Existing public Route53 hosted zone name (must already exist; never created/destroyed by this stack)"
  default     = "webnotary.org"
}
