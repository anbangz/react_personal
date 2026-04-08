################################################################################
# Secrets Manager — Backend API secrets
################################################################################

resource "aws_secretsmanager_secret" "DevBackendMongoDBURI" {
  name        = "dev/blog-api/mongodb-uri"
  description = "MongoDB Atlas connection URI for the dev blog API"
}

resource "aws_secretsmanager_secret" "ProdBackendMongoDBURI" {
  name        = "prod/blog-api/mongodb-uri"
  description = "MongoDB Atlas connection URI for the prod blog API"
}

resource "aws_secretsmanager_secret" "DevBackendAPIKey" {
  name        = "dev/blog-api/api-key"
  description = "Admin API key for the dev blog API"
}

resource "aws_secretsmanager_secret" "ProdBackendAPIKey" {
  name        = "prod/blog-api/api-key"
  description = "Admin API key for the prod blog API"
}
