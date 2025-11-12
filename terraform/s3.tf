# S3 bucket for hosting Angular app
resource "aws_s3_bucket" "app_bucket" {
  bucket = "${var.project_name}-${var.app_bucket_name}"
}

# S3 bucket versioning (Optional)
resource "aws_s3_bucket_versioning" "app_versioning" {
  bucket = aws_s3_bucket.app_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket as website (Configuration to redirect all requests to index.html)
resource "aws_s3_bucket_website_configuration" "app_www_config" {
  bucket = aws_s3_bucket.app_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" # SPA routing handling
  }
}

# S3 bucket public hosting (Static website publicly accessible ...)
resource "aws_s3_bucket_public_access_block" "app_s3_private_access_only" {
  bucket = aws_s3_bucket.app_bucket.id    # NOTICE this is the app's bucket not the log's one

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
