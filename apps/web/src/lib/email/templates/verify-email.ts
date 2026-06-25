interface VerifyEmailParams {
  recipientName: string;
  confirmUrl: string;
}

export function buildVerifyEmail(params: VerifyEmailParams) {
  const { recipientName, confirmUrl } = params;

  const subject = 'Confirm your email to activate your PLAYOFFE account';

  const text = `
Hi ${recipientName},

Thanks for signing up for PLAYOFFE! Click the link below to confirm your email and activate your account:

${confirmUrl}

If you didn't create this account, you can safely ignore this email.

— The PLAYOFFE Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
  <div style="margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px;">
      🏓 PLAYOFFE
    </h1>
  </div>

  <h2 style="font-size: 20px; font-weight: 600; color: #111827;">
    Confirm your email
  </h2>

  <p style="color: #374151; line-height: 1.6;">
    Hi <strong>${recipientName}</strong>,<br><br>
    Thanks for signing up for PLAYOFFE! Click the button below to confirm your email
    address and activate your account.
  </p>

  <div style="margin: 32px 0; text-align: center;">
    <a href="${confirmUrl}"
       style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px;
              border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">
      Confirm email &amp; activate account
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px;">
    If you didn't create this account, you can safely ignore this email.
  </p>
</body>
</html>
`.trim();

  return { subject, html, text };
}
