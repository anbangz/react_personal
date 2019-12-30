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
    }, 
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": [
        "${aws_s3_bucket.PersonalWebsiteRoot.arn}",
        "${aws_s3_bucket.PersonalWebsiteRoot.arn}/*"
      ]
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
        "Branch"               = "release",
        # For some reason this doesn't ACTUALLY work - see https://github.com/terraform-providers/terraform-provider-aws/issues/2796
        # Because this is essentially cleared every time, Terraform infers that OAuthToken is set with every apply action
        "OAuthToken" = jsondecode(data.aws_secretsmanager_secret_version.GithubTokenSecret.secret_string)["github-react-personal"]
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
        "BucketName" = "${aws_s3_bucket.PersonalWebsiteRoot.bucket}"
        "Extract"    = "true"
      }
    }
  }
}

data "aws_secretsmanager_secret_version" "GithubTokenSecret" {
  secret_id = "arn:aws:secretsmanager:us-west-2:261882595951:secret:github-react_personal-MfNPNZ"
}

# TODO: setup Github / Codepipeline webhooks for immediate sourcing
# resource "aws_secretsmanager_secret" "AWSGithubSecret" {
#   name = "AWSGithubSecret"
# }

# data "aws_secretsmanager_secret_version" "AWSGithubSecret" {
#   secret_id = "${aws_secretsmanager_secret.AWSGithubSecret.arn}"
# }


# resource "aws_codepipeline_webhook" "PersonalWebsitePiplineSourceWebhook" {
#   name            = "PersonalWebsitePiplineSourceWebhook"
#   authentication  = "GITHUB_HMAC"
#   target_action   = "Source"
#   target_pipeline = "${aws_codepipeline.PersonalWebsitePipeline.name}"

#   authentication_configuration {
#     secret_token = jsondecode(data.aws_secretsmanager_secret_version.GithubTokenSecret.secret_string)["github-react-personal"]
#   }

#   filter {
#     json_path    = "$.ref"
#     match_equals = "refs/heads/{Branch}"
#   }
# }

# # Wire the CodePipeline webhook into a GitHub repository.
# resource "github_repository_webhook" "bar" {
#   repository = "${github_repository.repo.name}"

#   name = "web"

#   configuration {
#     url          = "${aws_codepipeline_webhook.bar.url}"
#     content_type = "json"
#     insecure_ssl = true
#     secret       = "${local.webhook_secret}"
#   }

#   events = ["push"]
# }
