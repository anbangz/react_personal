resource "aws_s3_bucket" "PersonalWebsitePipelineBucket" {
  bucket = "codepipeline-anbangzme-website-deployment"
  acl    = "private"
}

resource "aws_iam_role" "PersonalWebsitePipelineRole" {
  name = "PersonalWebsitePipelineRole"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}
resource "aws_iam_role_policy" "PersonalWebsitePipelineRolePolicy" {
  name = "PersonalWebsitePipelineRolePolicy"
  role = "${aws_iam_role.PersonalWebsitePipelineRole.id}"

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
      "Action": [
        "codebuild:BatchGetBuilds",
        "codebuild:StartBuild"
      ],
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_codepipeline" "PersonalWebsitePipeline" {
  name     = "PersonalWebsitePipeline"
  role_arn = "${aws_iam_role.PersonalWebsitePipelineRole.arn}"
  artifact_store {
    location = "${aws_s3_bucket.PersonalWebsitePipelineBucket.bucket}"
    type     = "S3"
  }
  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "ThirdParty"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        "Owner"                = "anbangz",
        "Repo"                 = "react_personal",
        "PollForSourceChanges" = "true",
        "Branch"               = "master",
        "OAuthToken"           = "${data.aws_secretsmanager_secret_version.GithubTokenSecret.secret_string}"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        "ProjectName" = "${aws_codebuild_project.PersonalWebsiteBuild.name}"
      }
    }

  }

  # stage {
  #   name = "Deploy"
  #   action {
  #     name     = "Deploy"
  #     category = "Deploy"
  #     owner    = "AWS"
  #     provider = "Amazon S3"
  #     version  = "1"
  #   }
  # }
}

data "aws_secretsmanager_secret_version" "GithubTokenSecret" {
  secret_id = "arn:aws:secretsmanager:us-west-2:261882595951:secret:github-react_personal-MfNPNZ"
}
