output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.app_bucket.arn
}

output "s3_bucket_domain" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.app_bucket.bucket_domain_name
}

output "s3_bucket_website_endpoint" {
  description = "S3 static website endpoint"
  value       = aws_s3_bucket_website_configuration.app_www_config.website_endpoint
}

output "cloud_front_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.app_distribution.id
}

output "cloud_front_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.app_distribution.domain_name
}

output "cloud_front_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.app_distribution.arn
}

output "cloud_front_distribution_status" {
  description = "Status of the CloudFront distribution"
  value       = aws_cloudfront_distribution.app_distribution.status
}
