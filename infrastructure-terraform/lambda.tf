################################################################################
# Lambda IAM Roles
################################################################################

resource "aws_iam_role" "DevBackendAPILambdaRole" {
  name = "DevBackendAPILambdaRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "DevBackendAPILambdaPolicy" {
  name = "DevBackendAPILambdaPolicy"
  role = aws_iam_role.DevBackendAPILambdaRole.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "CloudWatchLogs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid      = "S3PhotoAccess"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"]
        Resource = ["${aws_s3_bucket.DevPhotoBucket.arn}", "${aws_s3_bucket.DevPhotoBucket.arn}/*"]
      },
      {
        Sid      = "SecretsAccess"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.DevBackendMongoDBURI.arn, aws_secretsmanager_secret.DevBackendAPIKey.arn]
      },
      {
        Sid      = "CodePipelineReadAccess"
        Effect   = "Allow"
        Action   = [
          "codepipeline:GetPipeline",
          "codepipeline:GetPipelineState",
          "codepipeline:GetPipelineExecution",
          "codepipeline:ListPipelineExecutions"
        ]
        Resource = "arn:aws:codepipeline:*:${data.aws_caller_identity.current.account_id}:*"
      }
    ]
  })
}

resource "aws_iam_role" "BackendAPILambdaRole" {
  name = "BackendAPILambdaRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "BackendAPILambdaPolicy" {
  name = "BackendAPILambdaPolicy"
  role = aws_iam_role.BackendAPILambdaRole.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "CloudWatchLogs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid      = "S3PhotoAccess"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"]
        Resource = ["${aws_s3_bucket.ProdPhotoBucket.arn}", "${aws_s3_bucket.ProdPhotoBucket.arn}/*"]
      },
      {
        Sid      = "SecretsAccess"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.ProdBackendMongoDBURI.arn, aws_secretsmanager_secret.ProdBackendAPIKey.arn]
      },
      {
        Sid      = "CodePipelineReadAccess"
        Effect   = "Allow"
        Action   = [
          "codepipeline:GetPipeline",
          "codepipeline:GetPipelineState",
          "codepipeline:GetPipelineExecution",
          "codepipeline:ListPipelineExecutions"
        ]
        Resource = "arn:aws:codepipeline:*:${data.aws_caller_identity.current.account_id}:*"
      }
    ]
  })
}

################################################################################
# Lambda Functions
################################################################################

resource "aws_lambda_function" "DevBackendAPIHandler" {
  function_name = "DevBackendAPIHandler"
  role          = aws_iam_role.DevBackendAPILambdaRole.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["x86_64"]
  timeout       = 30
  memory_size   = 128

  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda-placeholder.zip")

  environment {
    variables = {
      MONGODB_URI            = "PLACEHOLDER_SET_VIA_SECRETS"
      MONGODB_URI_SECRET_ARN = aws_secretsmanager_secret.DevBackendMongoDBURI.arn
      API_KEY                = "PLACEHOLDER_SET_VIA_SECRETS"
      API_KEY_SECRET_ARN     = aws_secretsmanager_secret.DevBackendAPIKey.arn
      MONGODB_DATABASE       = "anbangz_blog_dev"
      S3_BUCKET              = aws_s3_bucket.DevPhotoBucket.bucket
      PHOTOS_CDN_URL         = "https://dev-photos.${var.website_domain}"
      ALLOWED_ORIGIN         = "https://dev.${var.website_domain}"
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_lambda_function" "BackendAPIHandler" {
  function_name = "BackendAPIHandler"
  role          = aws_iam_role.BackendAPILambdaRole.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["x86_64"]
  timeout       = 30
  memory_size   = 128

  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda-placeholder.zip")

  environment {
    variables = {
      MONGODB_URI            = "PLACEHOLDER_SET_VIA_SECRETS"
      MONGODB_URI_SECRET_ARN = aws_secretsmanager_secret.ProdBackendMongoDBURI.arn
      API_KEY                = "PLACEHOLDER_SET_VIA_SECRETS"
      API_KEY_SECRET_ARN     = aws_secretsmanager_secret.ProdBackendAPIKey.arn
      MONGODB_DATABASE       = "anbangz_blog_prod"
      S3_BUCKET              = aws_s3_bucket.ProdPhotoBucket.bucket
      PHOTOS_CDN_URL         = "https://photos.${var.website_domain}"
      ALLOWED_ORIGIN         = "https://${var.website_domain}"
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}
