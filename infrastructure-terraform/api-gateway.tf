################################################################################
# API Gateway HTTP APIs
################################################################################

resource "aws_apigatewayv2_api" "DevBackendAPI" {
  name          = "DevBackendAPI"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_api" "BackendAPI" {
  name          = "BackendAPI"
  protocol_type = "HTTP"
}

################################################################################
# Lambda Integrations
################################################################################

resource "aws_apigatewayv2_integration" "DevBackendIntegration" {
  api_id                 = aws_apigatewayv2_api.DevBackendAPI.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.DevBackendAPIHandler.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "BackendIntegration" {
  api_id                 = aws_apigatewayv2_api.BackendAPI.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.BackendAPIHandler.invoke_arn
  payload_format_version = "2.0"
}

################################################################################
# Routes — catch-all to Lambda
################################################################################

resource "aws_apigatewayv2_route" "DevBackendCatchAll" {
  api_id    = aws_apigatewayv2_api.DevBackendAPI.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.DevBackendIntegration.id}"
}

resource "aws_apigatewayv2_route" "BackendCatchAll" {
  api_id    = aws_apigatewayv2_api.BackendAPI.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.BackendIntegration.id}"
}

################################################################################
# Stages (auto-deploy)
################################################################################

resource "aws_apigatewayv2_stage" "DevBackendStage" {
  api_id      = aws_apigatewayv2_api.DevBackendAPI.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_stage" "BackendStage" {
  api_id      = aws_apigatewayv2_api.BackendAPI.id
  name        = "$default"
  auto_deploy = true
}

################################################################################
# Lambda Permissions — allow API Gateway to invoke Lambda
################################################################################

resource "aws_lambda_permission" "DevBackendAPIGatewayInvoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.DevBackendAPIHandler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.DevBackendAPI.execution_arn}/*/*"
}

resource "aws_lambda_permission" "BackendAPIGatewayInvoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.BackendAPIHandler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.BackendAPI.execution_arn}/*/*"
}

################################################################################
# Custom Domain Names
################################################################################

resource "aws_acm_certificate" "APIGatewayRegionalCertificate" {
  domain_name               = "api.${var.website_domain}"
  subject_alternative_names = ["dev-api.${var.website_domain}"]
  validation_method         = "DNS"
}

resource "aws_route53_record" "APIGatewayRegionalCertificateValidationRecord" {
  for_each = {
    for dvo in aws_acm_certificate.APIGatewayRegionalCertificate.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  zone_id         = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
}

resource "aws_acm_certificate_validation" "APIGatewayRegionalCertificateValidation" {
  certificate_arn = aws_acm_certificate.APIGatewayRegionalCertificate.arn
  validation_record_fqdns = [
    for record in aws_route53_record.APIGatewayRegionalCertificateValidationRecord : record.fqdn
  ]
}

resource "aws_apigatewayv2_domain_name" "DevAPIDomain" {
  domain_name = "dev-api.${var.website_domain}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.APIGatewayRegionalCertificateValidation.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_domain_name" "ProdAPIDomain" {
  domain_name = "api.${var.website_domain}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.APIGatewayRegionalCertificateValidation.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

################################################################################
# API Mappings
################################################################################

resource "aws_apigatewayv2_api_mapping" "DevAPIMapping" {
  api_id      = aws_apigatewayv2_api.DevBackendAPI.id
  domain_name = aws_apigatewayv2_domain_name.DevAPIDomain.id
  stage       = aws_apigatewayv2_stage.DevBackendStage.id
}

resource "aws_apigatewayv2_api_mapping" "ProdAPIMapping" {
  api_id      = aws_apigatewayv2_api.BackendAPI.id
  domain_name = aws_apigatewayv2_domain_name.ProdAPIDomain.id
  stage       = aws_apigatewayv2_stage.BackendStage.id
}

################################################################################
# Route53 Records for API
################################################################################

resource "aws_route53_record" "DevAPIRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "dev-api.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.DevAPIDomain.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.DevAPIDomain.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ProdAPIRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "api.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.ProdAPIDomain.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.ProdAPIDomain.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
