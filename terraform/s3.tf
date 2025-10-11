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
resource "aws_s3_bucket_public_access_block" "app_public_access" {
  bucket = aws_s3_bucket.app_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 bucket READ-ONLY policy (... Public but READ-ONLY)
resource "aws_s3_bucket_policy" "app_bucket_policy" {
  bucket = aws_s3_bucket.app_bucket.id
  policy = data.aws_iam_policy_document.s3_public_read.json
}

# IAM Policy Document for Public Read Access
data "aws_iam_policy_document" "s3_public_read" {
  statement {
    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "${aws_s3_bucket.app_bucket.arn}/*",
    ]
  }
}
