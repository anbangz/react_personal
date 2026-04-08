################################################################################
# Backend API Pipeline
################################################################################

resource "aws_codepipeline" "BackendAPIPipeline" {
  name          = "BackendAPIPipeline"
  role_arn      = aws_iam_role.PersonalWebsitePipelineRole.arn
  pipeline_type = "V2"

  artifact_store {
    location = aws_s3_bucket.PersonalWebsitePipelineBucket.bucket
    type     = "S3"
  }

  trigger {
    provider_type = "CodeStarSourceConnection"

    git_configuration {
      source_action_name = "Source"

      push {
        branches {
          includes = ["master"]
        }

        file_paths {
          includes = ["backend/**"]
        }
      }
    }
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
        DetectChanges    = "false"
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
        ProjectName = aws_codebuild_project.BackendAPIBuild.name
      }
    }
  }

  stage {
    name = "DeployDev"
    action {
      name            = "DeployDev"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.BackendAPIDeploy.name
        EnvironmentVariables = jsonencode([{
          name  = "LAMBDA_FUNCTION_NAME"
          value = aws_lambda_function.DevBackendAPIHandler.function_name
          type  = "PLAINTEXT"
        }])
      }
    }
  }

  stage {
    name = "DeployProd"
    action {
      name            = "DeployProd"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.BackendAPIDeploy.name
      }
    }
  }
}
