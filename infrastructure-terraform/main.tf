provider "aws" {
  region  = "us-west-2"
  version = "~> 2.43"
}

provider "aws" {
  region  = "us-east-1"
  alias = "us-east-1"
  version = "~> 2.43"
}

variable "website_domain" {
  type = "string"
  default = "anbangz.me"
}

resource "aws_s3_bucket" "PersonalWebsiteRoot" {
  bucket = "${var.website_domain}"

  website {
    index_document = "index.html"
    # the error_document has to also point to index.html, as SPA pathing will cause S3 to look
    # for an object with the path specified in the request. 404 errors will be handled in the website
    # code by react-router
    error_document = "index.html"
  }
}

data "aws_s3_bucket" "PersonalWebsiteRoot" {
  bucket = "${aws_s3_bucket.PersonalWebsiteRoot.bucket}"
}

resource "aws_s3_bucket_policy" "PersonalWebsiteBucketPublicAccess" {
  bucket = "${aws_s3_bucket.PersonalWebsiteRoot.bucket}"
  policy = <<POLICY
{
  "Version":"2012-10-17",
  "Statement":[{
    "Sid":"PersonalWebsiteBucketPublicAccess",
    "Effect":"Allow",
    "Principal":"*",
    "Action": "s3:GetObject",
    "Resource": "${aws_s3_bucket.PersonalWebsiteRoot.arn}/*"
  }]
}
POLICY
}

resource "aws_s3_bucket" "PersonalWebsiteRedirect" {
  bucket = "www.${var.website_domain}"

  website {
    redirect_all_requests_to = "${aws_s3_bucket.PersonalWebsiteRoot.bucket}"
  }
}

data "aws_s3_bucket" "PersonalWebsiteRedirect" {
  bucket = "${aws_s3_bucket.PersonalWebsiteRedirect.bucket}"
}

resource "aws_route53_zone" "PersonalWebsiteHostedZone" {
  name = "${var.website_domain}"
  comment = "Route53 hosted zone for the anbangz.me website. Managed by Terraform"
}

resource "aws_route53_record" "PersonalWebsiteRecordSet" {
  zone_id = "${aws_route53_zone.PersonalWebsiteHostedZone.zone_id}"
  name    = "${var.website_domain}"
  type    = "A"

  alias {
    name = "${aws_cloudfront_distribution.PersonalWebsiteDistribution.domain_name}"
    zone_id = "${aws_cloudfront_distribution.PersonalWebsiteDistribution.hosted_zone_id}"
    # name = "${data.aws_s3_bucket.PersonalWebsiteRoot.website_domain}"
    # zone_id = "${data.aws_s3_bucket.PersonalWebsiteRoot.hosted_zone_id}"
    evaluate_target_health = false
  }
}


resource "aws_route53_record" "PersonalWebsiteRedirectRecordSet" {
  zone_id = "${aws_route53_zone.PersonalWebsiteHostedZone.zone_id}"
  name    = "www.${var.website_domain}"
  type    = "A"

  alias {
    name = "${aws_cloudfront_distribution.PersonalWebsiteDistribution.domain_name}"
    zone_id = "${aws_cloudfront_distribution.PersonalWebsiteDistribution.hosted_zone_id}"
    # name = "${data.aws_s3_bucket.PersonalWebsiteRedirect.website_domain}"
    # zone_id = "${data.aws_s3_bucket.PersonalWebsiteRedirect.hosted_zone_id}"
    evaluate_target_health = false
  }
}

resource "aws_acm_certificate" "PersonalWebsiteSSLCertificate" {
  provider = "aws.us-east-1"
  domain_name = "anbangz.me"
  subject_alternative_names = ["*.anbangz.me"]
  validation_method = "DNS"
}

resource "aws_route53_record" "PersonalWebsiteSSLCertificateRecordSet" {
  zone_id = "${aws_route53_zone.PersonalWebsiteHostedZone.zone_id}"

  name = "${aws_acm_certificate.PersonalWebsiteSSLCertificate.domain_validation_options.0.resource_record_name}"
  type = "${aws_acm_certificate.PersonalWebsiteSSLCertificate.domain_validation_options.0.resource_record_type}"
  records = ["${aws_acm_certificate.PersonalWebsiteSSLCertificate.domain_validation_options.0.resource_record_value}"]

  ttl     = "60"
}

resource "aws_acm_certificate_validation" "PersonalWebsiteSSLCertificateValidation" {
  provider = "aws.us-east-1"
  certificate_arn = "${aws_acm_certificate.PersonalWebsiteSSLCertificate.arn}"
  validation_record_fqdns = ["${aws_route53_record.PersonalWebsiteSSLCertificateRecordSet.fqdn}"]
}

resource "aws_cloudfront_distribution" "PersonalWebsiteDistribution" {
  enabled = true
  origin {
    domain_name = "${data.aws_s3_bucket.PersonalWebsiteRoot.website_endpoint}"
    origin_id = "S3-${var.website_domain}"

    custom_origin_config {
        http_port              = "80"
        https_port             = "443"
        origin_protocol_policy = "http-only"
        origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }
  }

  price_class = "PriceClass_All"
  aliases = ["${var.website_domain}", "www.${var.website_domain}"]
  default_root_object = "index.html"


  default_cache_behavior {
    target_origin_id = "S3-${var.website_domain}"

    viewer_protocol_policy = "allow-all"
    allowed_methods = ["GET", "HEAD"]
    cached_methods = ["GET", "HEAD"]
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  viewer_certificate {
    acm_certificate_arn = "${aws_acm_certificate.PersonalWebsiteSSLCertificate.arn}"
    ssl_support_method = "sni-only"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

