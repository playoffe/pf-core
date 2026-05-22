interface ProvisionalInviteParams {
  recipientName: string;
  tournamentName: string;
  clubName: string;
  claimToken: string;
  appUrl: string;
  expiresAt: string;
}

export function buildProvisionalInviteEmail(params: ProvisionalInviteParams) {
  const {
    recipientName,
    tournamentName,
    clubName,
    claimToken,
    appUrl,
    expiresAt,
  } = params;

  const claimUrl = `${appUrl}/claim/${claimToken}`;
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const subject = `You've been entered in ${tournamentName} — claim your account`;

  const text = `
Hi ${recipientName},

You've been registered for ${tournamentName} at ${clubName}.

To confirm your entry and set up your PLAYOFFE account, click the link below:

${claimUrl}

This link expires on ${expiryDate}.

If you didn't expect this invitation, you can safely ignore this email.

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
    You've been entered in ${tournamentName}
  </h2>

  <p style="color: #374151; line-height: 1.6;">
    Hi <strong>${recipientName}</strong>,<br><br>
    <strong>${clubName}</strong> has registered you for <strong>${tournamentName}</strong>.
    Click the button below to confirm your entry and set up your PLAYOFFE account.
  </p>

  <div style="margin: 32px 0; text-align: center;">
    <a href="${claimUrl}"
       style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px;
              border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">
      Claim your account &amp; confirm entry
    </a>
  </div>

  <p style="color: #6b7280; font-size: 14px;">
    This link expires on <strong>${expiryDate}</strong>. After that, you'll need to contact the organiser
    to re-send an invite.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px;">
    If you didn't expect this invitation, you can safely ignore this email.
    Your account will only be created when you click the link above.
  </p>
</body>
</html>
`.trim();

  return { subject, html, text };
}
