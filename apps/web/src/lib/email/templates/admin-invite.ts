interface AdminInviteEmailOpts {
  clubName: string;
  inviteeName: string;
  inviteUrl: string;
  expiresAt: string; // ISO date string
  appUrl: string;
}

export function buildAdminInviteEmail(opts: AdminInviteEmailOpts): { subject: string; html: string; text: string } {
  const { clubName, inviteeName, inviteUrl, expiresAt, appUrl } = opts;

  const expiryDate = new Date(expiresAt).toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const subject = `You're invited to manage ${clubName} on PLAYOFFE`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155">
        <!-- Header -->
        <tr>
          <td style="background:#4c1d95;padding:24px 32px">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#c4b5fd;text-transform:uppercase;letter-spacing:0.08em">
              PLAYOFFE Platform
            </p>
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff">
              You've been invited as a club organiser
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;line-height:1.6">
              Hi <strong style="color:#ffffff">${inviteeName}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;line-height:1.6">
              You've been invited to set up and manage
              <strong style="color:#ffffff">${clubName}</strong> on PLAYOFFE —
              the platform for running pickleball tournaments, tracking results, and managing your club.
            </p>

            <!-- Club card -->
            <table cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;padding:16px 20px;width:100%;box-sizing:border-box;margin-bottom:24px">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Your club</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">${clubName}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#64748b">
              This invite expires on <strong style="color:#94a3b8">${expiryDate}</strong>. It is single-use — once
              you complete setup, the link becomes inactive.
            </p>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 28px">
            <a href="${inviteUrl}"
               style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px">
              Set up your club →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #334155">
            <p style="margin:0;font-size:12px;color:#475569">
              PLAYOFFE · <a href="${appUrl}" style="color:#7c3aed;text-decoration:none">${appUrl.replace('https://', '')}</a>
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#334155">
              If you didn't expect this invite, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `You've been invited to manage ${clubName} on PLAYOFFE`,
    ``,
    `Hi ${inviteeName},`,
    ``,
    `You've been invited to set up and manage ${clubName} on PLAYOFFE.`,
    ``,
    `Accept your invite: ${inviteUrl}`,
    ``,
    `This link expires on ${expiryDate}. It is single-use.`,
    ``,
    `If you didn't expect this invite, you can safely ignore this email.`,
    ``,
    `— The PLAYOFFE Team`,
  ].join('\n');

  return { subject, html, text };
}
