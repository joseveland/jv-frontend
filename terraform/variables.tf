# Related to `terraform plan -var-file="..."` command, that is `default.tfvars` file

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "jv-frontend" # Mainly to reflect the GitHub repo by looking the AWS resource names themselves
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
}

variable "environment" {
  description = "Mainly used for resource naming or Environment tagging (e.g., dev, staging, prod)"
  type        = string
}

variable "app_bucket_name" {
  description = "S3 bucket name to store the Angular application"
  type        = string
}

variable "logs_bucket_name" {
  description = "OPTIONAL: S3 bucket name to store access logs from CloudFront"
  type        = string
  default     = null
}

variable "cloud_front_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100" # US/Canada/Europe ... See https://aws.amazon.com/cloudfront/pricing/
}

variable "cloud_front_aliases" {
  description = "Optional custom domains for CloudFront"
  type        = list(string)
  default     = []
}
