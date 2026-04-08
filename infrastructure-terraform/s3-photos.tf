################################################################################
# S3 Photo Buckets
################################################################################

resource "aws_s3_bucket" "DevPhotoBucket" {
  bucket = "dev-photos.${var.website_domain}"
}

resource "aws_s3_bucket_public_access_block" "DevPhotoBucketPublicAccess" {
  bucket = aws_s3_bucket.DevPhotoBucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "ProdPhotoBucket" {
  bucket = "photos.${var.website_domain}"
}

resource "aws_s3_bucket_public_access_block" "ProdPhotoBucketPublicAccess" {
  bucket = aws_s3_bucket.ProdPhotoBucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

################################################################################
# CloudFront Origin Access Controls for Photo Buckets
################################################################################

resource "aws_cloudfront_origin_access_control" "PhotoOAC" {
  name                              = "photo-bucket-oac"
  description                       = "OAC for photo S3 buckets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

################################################################################
# S3 Bucket Policies — allow CloudFront OAC access
################################################################################

resource "aws_s3_bucket_policy" "DevPhotoBucketPolicy" {
  bucket = aws_s3_bucket.DevPhotoBucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.DevPhotoBucket.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.DevPhotoDistribution.arn
        }
      }
    }]
  })
}

resource "aws_s3_bucket_policy" "ProdPhotoBucketPolicy" {
  bucket = aws_s3_bucket.ProdPhotoBucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.ProdPhotoBucket.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.ProdPhotoDistribution.arn
        }
      }
    }]
  })
}

################################################################################
# CloudFront Distributions for Photos
################################################################################

resource "aws_cloudfront_distribution" "DevPhotoDistribution" {
  enabled = true
  origin {
    domain_name              = aws_s3_bucket.DevPhotoBucket.bucket_regional_domain_name
    origin_id                = "S3-dev-photos"
    origin_access_control_id = aws_cloudfront_origin_access_control.PhotoOAC.id
  }

  price_class = "PriceClass_All"
  aliases     = ["dev-photos.${var.website_domain}"]

  lifecycle {
    ignore_changes = [web_acl_id]
  }

  default_cache_behavior {
    target_origin_id       = "S3-dev-photos"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
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

resource "aws_cloudfront_distribution" "ProdPhotoDistribution" {
  enabled = true
  origin {
    domain_name              = aws_s3_bucket.ProdPhotoBucket.bucket_regional_domain_name
    origin_id                = "S3-prod-photos"
    origin_access_control_id = aws_cloudfront_origin_access_control.PhotoOAC.id
  }

  price_class = "PriceClass_All"
  aliases     = ["photos.${var.website_domain}"]

  lifecycle {
    ignore_changes = [web_acl_id]
  }

  default_cache_behavior {
    target_origin_id       = "S3-prod-photos"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
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

################################################################################
# Route53 Records for Photo CDN
################################################################################

resource "aws_route53_record" "DevPhotoRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "dev-photos.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.DevPhotoDistribution.domain_name
    zone_id                = aws_cloudfront_distribution.DevPhotoDistribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ProdPhotoRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "photos.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.ProdPhotoDistribution.domain_name
    zone_id                = aws_cloudfront_distribution.ProdPhotoDistribution.hosted_zone_id
    evaluate_target_health = false
  }
}
