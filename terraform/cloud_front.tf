# CloudFront Origin Access Identity (OAI)
resource "aws_cloudfront_origin_access_identity" "app_oai" {
  comment = "OAI for ${var.app_bucket_name}"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "app_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront for Angular App ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.cloud_front_price_class

  aliases = var.cloud_front_aliases

  # This is like accessing the bucket by network domain
  origin {
    domain_name = aws_s3_bucket.app_bucket.bucket_regional_domain_name
    # This one makes the magic to link an S3 bucket with CloudFront using OAI as middle man
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.app_oai.cloudfront_access_identity_path
    }
    # Unique identifier for this origin (The bucket is already unique name so just `s3-` prefix to quickly identify)
    origin_id = "s3-${aws_s3_bucket.app_bucket.id}"
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.app_bucket.id}"

    # Forward all query strings and cookies
    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }

    # SPA routing - forward 404s to index.html
    response_headers_policy_id = "67f7725c-6f97-4210-82d7-5512b31e9d03" # Managed-CORS-S3Origin

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Using the given CloudFront certificate `*.cloudfront.net` so ready to use via HTTPS
  viewer_certificate {
    cloudfront_default_certificate = true
    # acm_certificate_arn      = var.acm_certificate_arn  # Uncomment for custom domain
    # ssl_support_method       = "sni-only"               # Uncomment for custom domain
    # minimum_protocol_version = "TLSv1.2_2021"           # Uncomment for custom domain
  }

  depends_on = length(aws_s3_bucket.logs_bucket) == 0 ? [
    aws_s3_bucket.app_bucket,
    ] : [
    aws_s3_bucket.app_bucket,
    aws_s3_bucket.logs_bucket[0], # It will be just 1 instance so index 0 access is fine
  ]

  # OPTIONAL (dynamic/content) if logs bucket is created (non empty list)
  # The `logging_config` field will be created and dynamically that same name is used as iterator variable (.value) next
  # The `for_each` conditionally creates the block only if the logs bucket is defined as otherwise loops 0 times
  # The `content` block is required when using `for_each` within `dynamic`
  dynamic "logging_config" {
    for_each = aws_s3_bucket.logs_bucket
    content {
      bucket          = logging_config.value.bucket_domain_name
      include_cookies = false # OPTIONAL: Cookies can be too long so better to avoid them within the logs
      # prefix = "logs/"      # OPTIONAL: Prefix for better organization in a bucket is typically a folder
    }
  }
}

# Policy document that allows CloudFront OAI to access S3 (GetObject like READ-ONLY is enough for a static website)
data "aws_iam_policy_document" "s3_policy_with_cloud_front" {
  source_policy_documents = [
    data.aws_iam_policy_document.s3_public_read.json
  ]

  statement {
    principals {
      type = "AWS"
      identifiers = [
        aws_cloudfront_origin_access_identity.app_oai.iam_arn
      ]
    }
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${aws_s3_bucket.app_bucket.arn}/*",
    ]
  }
}

# That policy above goes to my app's S3 bucket
resource "aws_s3_bucket_policy" "app_bucket_cloud_front_oai_policy" {
  bucket = aws_s3_bucket.app_bucket.id
  policy = data.aws_iam_policy_document.s3_policy_with_cloud_front.json
}
