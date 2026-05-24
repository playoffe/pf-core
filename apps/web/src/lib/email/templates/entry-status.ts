interface EntryStatusParams {
  playerName: string;
  tournamentName: string;
  categoryName: string;
  tournamentUrl: string;
  eventsUrl: string;
}

// ── Entry approved / confirmed ────────────────────────────────────────────────

export function buildEntryConfirmedEmail(params: EntryStatusParams) {
  const { playerName, tournamentName, categoryName, tournamentUrl } = params;

  const subject = `You're confirmed for ${tournamentName} 🎉`;

  const text = `
Hi ${playerName},

Your registration for ${categoryName} at ${tournamentName} has been approved — you're in!

View your event: ${tournamentUrl}

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
    <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">
      PLAY<span style="color: #7c3aed;">OFFE</span>
    </h1>
  </div>

  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 0 0 24px; text-align: center;">
    <p style="font-size: 28px; margin: 0 0 8px;">✅</p>
    <p style="font-size: 18px; font-weight: 700; color: #166534; margin: 0;">You're confirmed!</p>
  </div>

  <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
    Hi <strong>${playerName}</strong>,
  </p>
  <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">
    Your registration for <strong>${categoryName}</strong> at <strong>${tournamentName}</strong>
    has been approved. You're all set to compete!
  </p>

  <div style="margin: 0 0 32px; text-align: center;">
    <a href="${tournamentUrl}"
       style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px;
              border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">
      View event
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    You're receiving this because you registered for a tournament on PLAYOFFE.
  </p>
</body>
</html>
`.trim();

  return { subject, html, text };
}

// ── Entry rejected ────────────────────────────────────────────────────────────

export function buildEntryRejectedEmail(params: EntryStatusParams) {
  const { playerName, tournamentName, categoryName, eventsUrl } = params;

  const subject = `Registration update for ${tournamentName}`;

  const text = `
Hi ${playerName},

Unfortunately your registration for ${categoryName} at ${tournamentName} was not approved by the organiser.

You can browse other events at: ${eventsUrl}

If you believe this is an error, please contact the tournament organiser directly.

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
    <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">
      PLAY<span style="color: #7c3aed;">OFFE</span>
    </h1>
  </div>

  <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px;">
    Registration update
  </h2>

  <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
    Hi <strong>${playerName}</strong>,
  </p>
  <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">
    Unfortunately your registration for <strong>${categoryName}</strong> at
    <strong>${tournamentName}</strong> was not approved by the tournament organiser.
  </p>
  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
    If you believe this is an error, please reach out to the tournament organiser directly.
    You're welcome to browse and register for other upcoming events.
  </p>

  <div style="margin: 0 0 32px; text-align: center;">
    <a href="${eventsUrl}"
       style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px;
              border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">
      Browse events
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    You're receiving this because you registered for a tournament on PLAYOFFE.
  </p>
</body>
</html>
`.trim();

  return { subject, html, text };
}

// ── Waitlist promoted ─────────────────────────────────────────────────────────

export function buildWaitlistPromotedEmail(params: EntryStatusParams) {
  const { playerName, tournamentName, categoryName, tournamentUrl } = params;

  const subject = `Great news — you're now registered for ${tournamentName}!`;

  const text = `
Hi ${playerName},

Good news! A spot opened up in ${categoryName} at ${tournamentName} — you've been moved from the waitlist and are now confirmed.

View your event: ${tournamentUrl}

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
    <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">
      PLAY<span style="color: #7c3aed;">OFFE</span>
    </h1>
  </div>

  <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 0 0 24px; text-align: center;">
    <p style="font-size: 28px; margin: 0 0 8px;">🎉</p>
    <p style="font-size: 18px; font-weight: 700; color: #92400e; margin: 0;">Spot opened up — you're in!</p>
  </div>

  <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
    Hi <strong>${playerName}</strong>,
  </p>
  <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">
    A spot opened up in <strong>${categoryName}</strong> at <strong>${tournamentName}</strong>
    — you've been moved off the waitlist and are now confirmed!
  </p>

  <div style="margin: 0 0 32px; text-align: center;">
    <a href="${tournamentUrl}"
       style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px;
              border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">
      View event
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    You're receiving this because you were on the waitlist for a tournament on PLAYOFFE.
  </p>
</body>
</html>
`.trim();

  return { subject, html, text };
}
