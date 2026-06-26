output "access_key_id" {
  description = "Access key ID for the SES-send-only IAM user — set as AWS_ACCESS_KEY_ID in Vercel for this environment"
  value       = aws_iam_access_key.ses_sender.id
}

output "secret_access_key" {
  description = "Secret access key — set as AWS_SECRET_ACCESS_KEY in Vercel for this environment. Never print this in CI logs."
  value       = aws_iam_access_key.ses_sender.secret
  sensitive   = true
}

output "dkim_tokens" {
  description = "Add as 3 CNAME records: <token>._domainkey.<domain> -> <token>.dkim.amazonses.com"
  value       = aws_ses_domain_dkim.this.dkim_tokens
}

output "domain_verification_token" {
  description = "TXT record value for _amazonses.<domain> — only needed if not relying solely on DKIM for verification"
  value       = aws_ses_domain_identity.this.verification_token
}

output "identity_arn" {
  description = "SES identity ARN — useful for confirming the IAM policy's Resource matches"
  value       = aws_ses_domain_identity.this.arn
}
