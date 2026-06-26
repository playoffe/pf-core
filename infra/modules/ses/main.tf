# ── SES sender: domain identity + a least-privilege IAM user for Vercel ───────
#
# Email is only ever sent from apps/web (deployed to Vercel), never from the
# ECS workers — Vercel has no AWS IAM identity of its own (unlike ECS tasks,
# which assume aws_iam_role.task), so it needs a static, narrowly-scoped
# access key rather than an assumable role.
#
# One of these per environment (staging / prod) — never shared — so a leaked
# staging key can't be used to send mail as production, and each can be
# rotated/revoked independently.

data "aws_caller_identity" "current" {}

# ── Domain identity + DKIM ─────────────────────────────────────────────────────
# After apply, add the 3 DKIM CNAME records from dkim_tokens to your DNS
# provider for the domain to move from "pending" to "verified" in SES.

resource "aws_ses_domain_identity" "this" {
  domain = var.domain
}

resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}

# ── IAM user scoped to send-only, restricted to this one identity ────────────

resource "aws_iam_user" "ses_sender" {
  name = "${var.name_prefix}-ses-sender"
  path = "/playoffe/"

  tags = {
    Environment = var.environment
    Purpose     = "SES sending from apps/web on Vercel"
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_user_policy" "ses_send_only" {
  name = "${var.name_prefix}-ses-send-only"
  user = aws_iam_user.ses_sender.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ses:SendEmail", "ses:SendRawEmail"]
      Resource = "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.domain}"
    }]
  })
}

# Static access key — Terraform state will contain the secret in plaintext.
# Use a remote backend with encryption at rest (already the case if this repo
# uses S3+KMS or Terraform Cloud) and restrict who can read state for this dir.
resource "aws_iam_access_key" "ses_sender" {
  user = aws_iam_user.ses_sender.name
}
