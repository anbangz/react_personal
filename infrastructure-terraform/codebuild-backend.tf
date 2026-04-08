################################################################################
# Backend API CodeBuild Projects
################################################################################

resource "aws_codebuild_project" "BackendAPIBuild" {
  name         = "BackendAPIBuild"
  description  = "Compiles Go backend binary for Lambda"
  service_role = aws_iam_role.PersonalWebsiteCodebuildRole.arn

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    type         = "LINUX_CONTAINER"
    image        = "aws/codebuild/standard:7.0"
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "infrastructure-terraform/buildspec-backend-build.yml"
  }

  artifacts {
    type = "CODEPIPELINE"
  }
}

resource "aws_codebuild_project" "BackendAPIDeploy" {
  name         = "BackendAPIDeploy"
  description  = "Deploys Go binary to Lambda function"
  service_role = aws_iam_role.PersonalWebsiteCodebuildRole.arn

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    type         = "LINUX_CONTAINER"
    image        = "aws/codebuild/standard:7.0"

    environment_variable {
      name  = "LAMBDA_FUNCTION_NAME"
      value = aws_lambda_function.BackendAPIHandler.function_name
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "infrastructure-terraform/buildspec-backend-deploy.yml"
  }

  artifacts {
    type = "CODEPIPELINE"
  }
}
