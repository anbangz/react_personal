provider "aws" {
  region = "us-west-2"
}

provider "aws" {
  region = "us-east-1"
  alias  = "us-east-1"
}

variable "website_domain" {
  type    = string
  default = "anbangz.me"
}

resource "aws_s3_bucket" "PersonalWebsiteRoot" {
  bucket = var.website_domain
}

resource "aws_s3_bucket_website_configuration" "PersonalWebsiteRoot" {
  bucket = aws_s3_bucket.PersonalWebsiteRoot.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    # error_document must also point to index.html, as SPA pathing will cause S3 to look
    # for an object with the path specified in the request. 404 errors will be handled in the website
    # code by react-router
    key = "index.html"
  }
}

resource "aws_s3_bucket_policy" "PersonalWebsiteBucketPolicy" {
  bucket = aws_s3_bucket.PersonalWebsiteRoot.bucket
  policy = <<POLICY
{
  "Version":"2012-10-17",
  "Statement": [
    {
      "Sid":"PersonalWebsiteBucketPublicAccess",
      "Effect":"Allow",
      "Principal":"*",
      "Action": "s3:GetObject",
      "Resource": "${aws_s3_bucket.PersonalWebsiteRoot.arn}/*"
    },
    {
      "Sid":"PersonalWebsiteBucketCodePipelineAccess",
      "Effect":"Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "${aws_s3_bucket.PersonalWebsiteRoot.arn}/*"
    }
  ]
}
POLICY
}

################################################################################
# Dev Website (dev.anbangz.me)
################################################################################

resource "aws_s3_bucket" "DevWebsiteRoot" {
  bucket = "dev.${var.website_domain}"

  # IAM policy changes are eventually consistent. Wait for the propagation
  # delay before attempting to create this bucket, otherwise CreateBucket
  # may be denied if it races ahead of the updated TerraformCodeBuildPolicy.
  depends_on = [terraform_data.TerraformCodeBuildPolicyPropagation]
}

resource "aws_s3_bucket_website_configuration" "DevWebsiteRoot" {
  bucket = aws_s3_bucket.DevWebsiteRoot.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "DevWebsiteRootPublicAccessBlock" {
  bucket = aws_s3_bucket.DevWebsiteRoot.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "DevWebsiteBucketPolicy" {
  bucket     = aws_s3_bucket.DevWebsiteRoot.bucket
  depends_on = [aws_s3_bucket_public_access_block.DevWebsiteRootPublicAccessBlock]
  policy = <<POLICY
{
  "Version":"2012-10-17",
  "Statement": [
    {
      "Sid":"DevWebsiteBucketPublicAccess",
      "Effect":"Allow",
      "Principal":"*",
      "Action": "s3:GetObject",
      "Resource": "${aws_s3_bucket.DevWebsiteRoot.arn}/*"
    },
    {
      "Sid":"DevWebsiteBucketCodePipelineAccess",
      "Effect":"Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "${aws_s3_bucket.DevWebsiteRoot.arn}/*"
    }
  ]
}
POLICY
}

resource "aws_cloudfront_distribution" "DevWebsiteDistribution" {
  enabled = true
  origin {
    domain_name = aws_s3_bucket_website_configuration.DevWebsiteRoot.website_endpoint
    origin_id   = "S3-dev.${var.website_domain}"

    custom_origin_config {
      http_port              = "80"
      https_port             = "443"
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }
  }

  price_class         = "PriceClass_All"
  aliases             = ["dev.${var.website_domain}"]
  default_root_object = "index.html"

  lifecycle {
    ignore_changes = [web_acl_id]
  }

  default_cache_behavior {
    target_origin_id       = "S3-dev.${var.website_domain}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    # This account's CloudFront pricing plan does not allow custom cache policies.
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.PersonalWebsiteSSLCertificate.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

resource "aws_route53_record" "DevWebsiteRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "dev.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.DevWebsiteDistribution.domain_name
    zone_id                = aws_cloudfront_distribution.DevWebsiteDistribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_s3_bucket" "PersonalWebsiteRedirect" {
  bucket = "www.${var.website_domain}"
}

resource "aws_s3_bucket_website_configuration" "PersonalWebsiteRedirect" {
  bucket = aws_s3_bucket.PersonalWebsiteRedirect.id

  redirect_all_requests_to {
    host_name = var.website_domain
    protocol  = "http"
  }
}

resource "aws_route53_zone" "PersonalWebsiteHostedZone" {
  name    = var.website_domain
  comment = "Route53 hosted zone for the anbangz.me website. Managed by Terraform"
}

resource "aws_route53_record" "PersonalWebsiteRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = var.website_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.PersonalWebsiteDistribution.domain_name
    zone_id                = aws_cloudfront_distribution.PersonalWebsiteDistribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "PersonalWebsiteRedirectRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "www.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.PersonalWebsiteDistribution.domain_name
    zone_id                = aws_cloudfront_distribution.PersonalWebsiteDistribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_acm_certificate" "PersonalWebsiteSSLCertificate" {
  provider                  = aws.us-east-1
  domain_name               = "anbangz.me"
  subject_alternative_names = ["*.anbangz.me"]
  validation_method         = "DNS"
}

resource "aws_route53_record" "PersonalWebsiteSSLCertificateRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id

  name    = tolist(aws_acm_certificate.PersonalWebsiteSSLCertificate.domain_validation_options)[0].resource_record_name
  type    = tolist(aws_acm_certificate.PersonalWebsiteSSLCertificate.domain_validation_options)[0].resource_record_type
  records = [tolist(aws_acm_certificate.PersonalWebsiteSSLCertificate.domain_validation_options)[0].resource_record_value]

  ttl = 60
}

resource "aws_acm_certificate_validation" "PersonalWebsiteSSLCertificateValidation" {
  provider                = aws.us-east-1
  certificate_arn         = aws_acm_certificate.PersonalWebsiteSSLCertificate.arn
  validation_record_fqdns = [aws_route53_record.PersonalWebsiteSSLCertificateRecordSet.fqdn]
}

################################################################################
# Terraform Remote State Backend
################################################################################

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "TerraformStateBucket" {
  bucket = "terraform-state-anbangzme"
}

resource "aws_s3_bucket_versioning" "TerraformStateBucketVersioning" {
  bucket = aws_s3_bucket.TerraformStateBucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "TerraformStateBucketPublicAccessBlock" {
  bucket = aws_s3_bucket.TerraformStateBucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "TerraformStateBucketEncryption" {
  bucket = aws_s3_bucket.TerraformStateBucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_dynamodb_table" "TerraformStateLock" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

################################################################################
# CloudFront Distribution
################################################################################

resource "aws_cloudfront_cache_policy" "PersonalWebsiteCachePolicy" {
  depends_on = [terraform_data.TerraformCodeBuildPolicyPropagation]

  name        = "PersonalWebsiteCachePolicy"
  comment     = "Cache policy for anbangz.me with max cache duration of 1 hour"
  min_ttl     = 0
  default_ttl = 3600
  max_ttl     = 3600

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_distribution" "PersonalWebsiteDistribution" {
  enabled = true
  origin {
    domain_name = aws_s3_bucket_website_configuration.PersonalWebsiteRoot.website_endpoint
    origin_id   = "S3-${var.website_domain}"

    custom_origin_config {
      http_port              = "80"
      https_port             = "443"
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }
  }

  price_class         = "PriceClass_All"
  aliases             = [var.website_domain, "www.${var.website_domain}"]
  default_root_object = "index.html"

  # Keep the existing managed WAF ACL attachment. This distribution is enrolled
  # in a pricing plan subscription that disallows removing/replacing web_acl_id.
  lifecycle {
    ignore_changes = [web_acl_id]
  }

  default_cache_behavior {
    target_origin_id       = "S3-${var.website_domain}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    # This account's CloudFront pricing plan does not allow custom cache policies.
    # Keep an AWS-managed policy attached to this distribution.
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.PersonalWebsiteSSLCertificate.arn
    ssl_support_method  = "sni-only"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
