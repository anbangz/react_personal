resource "aws_iam_role" "PersonalWebsiteCodebuildRole" {
  name = "PersonalWebsiteCodebuildRole"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "PersonalWebsiteCodebuildPolicy" {
  name = "PersonalWebsiteCodebuildPolicy"
  role = aws_iam_role.PersonalWebsiteCodebuildRole.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect":"Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:GetBucketVersioning",
        "s3:PutObject"
      ],
      "Resource": [
        "${aws_s3_bucket.PersonalWebsitePipelineBucket.arn}",
        "${aws_s3_bucket.PersonalWebsitePipelineBucket.arn}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Resource": [
        "*"
      ],
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
    },
    {
      "Effect": "Allow",
      "Resource": [
        "${aws_cloudfront_distribution.PersonalWebsiteDistribution.arn}",
        "${aws_cloudfront_distribution.DevWebsiteDistribution.arn}"
      ],
      "Action": [
        "cloudfront:CreateInvalidation"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:UpdateFunctionCode"],
      "Resource": [
        "${aws_lambda_function.DevBackendAPIHandler.arn}",
        "${aws_lambda_function.BackendAPIHandler.arn}"
      ]
    }
  ]
}
EOF
}

resource "aws_codebuild_project" "PersonalWebsiteBuild" {
  name = "PersonalWebsiteBuild"
  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    type         = "LINUX_CONTAINER"
    image        = "aws/codebuild/standard:7.0"
  }
  source {
    type      = "CODEPIPELINE"
    buildspec = "infrastructure-terraform/buildspec.yml"
  }
  artifacts {
    type = "CODEPIPELINE"
  }
  service_role = aws_iam_role.PersonalWebsiteCodebuildRole.arn
}

resource "aws_codebuild_project" "PersonalWebsiteInvalidateCacheBuild" {
  name = "PersonalWebsiteInvalidateCacheBuild"
  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    type         = "LINUX_CONTAINER"
    image        = "aws/codebuild/standard:7.0"

    environment_variable {
      name  = "CLOUDFRONT_DISTRIBUTION_ID"
      value = aws_cloudfront_distribution.PersonalWebsiteDistribution.id
    }
  }
  source {
    type      = "CODEPIPELINE"
    buildspec = "infrastructure-terraform/buildspec-invalidate-cache.yml"
  }
  artifacts {
    type = "CODEPIPELINE"
  }
  service_role = aws_iam_role.PersonalWebsiteCodebuildRole.arn
}
