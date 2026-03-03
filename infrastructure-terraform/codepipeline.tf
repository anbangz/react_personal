resource "aws_s3_bucket" "PersonalWebsitePipelineBucket" {
  bucket = "codepipeline-anbangzme-website-deployment"
}

resource "aws_codestarconnections_connection" "github" {
  name          = "react-personal-github"
  provider_type = "GitHub"
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
  role = aws_iam_role.PersonalWebsitePipelineRole.id

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
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": [
        "${aws_s3_bucket.PersonalWebsiteRoot.arn}",
        "${aws_s3_bucket.PersonalWebsiteRoot.arn}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codestar-connections:UseConnection"
      ],
      "Resource": "${aws_codestarconnections_connection.github.arn}"
    }
  ]
}
EOF
}

resource "aws_codepipeline" "PersonalWebsitePipeline" {
  name     = "PersonalWebsitePipeline"
  role_arn = aws_iam_role.PersonalWebsitePipelineRole.arn
  artifact_store {
    location = aws_s3_bucket.PersonalWebsitePipelineBucket.bucket
    type     = "S3"
  }
  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "anbangz/react_personal"
        BranchName       = "master"
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
        ProjectName = aws_codebuild_project.PersonalWebsiteBuild.name
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "S3"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        BucketName = aws_s3_bucket.PersonalWebsiteRoot.bucket
        Extract    = "true"
      }
    }
  }

  stage {
    name = "InvalidateCache"
    action {
      name            = "InvalidateCache"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]

      configuration = {
        ProjectName = aws_codebuild_project.PersonalWebsiteInvalidateCacheBuild.name
      }
    }
  }
}
