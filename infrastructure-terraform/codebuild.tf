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
