# Additional S3 bucket for CloudFront logs
resource "aws_s3_bucket" "logs_bucket" {
  # Conditional to create the bucket only if defined
  count = var.logs_bucket_name == null ? 0 : 1
  bucket = "${var.project_name}-${var.logs_bucket_name}"
}

# S3 bucket for logs should be private
resource "aws_s3_bucket_acl" "logs_bucket_private" {
  count = var.logs_bucket_name == null ? 0 : 1
  bucket = var.logs_bucket_name == null ? null : aws_s3_bucket.logs_bucket.id

  acl    = "private"
}

# S3 bucket for logs doesn't need to have a website configuration
resource "aws_s3_bucket_public_access_block" "logs_bucket_non_public" {
  count = var.logs_bucket_name == null ? 0 : 1
  bucket = var.logs_bucket_name == null ? null : aws_s3_bucket.logs_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
