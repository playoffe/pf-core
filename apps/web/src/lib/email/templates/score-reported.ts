interface ScoreReportedParams {
  tournamentName: string;
  categoryName: string;
  roundName: string;
  playerA: string;
  playerB: string;
  reportedScore: string; // e.g. "11-8, 11-6"
  reviewUrl: string;
}

export function buildScoreReportedEmail(params: ScoreReportedParams) {
  const { tournamentName, categoryName, roundName, playerA, playerB, reportedScore, reviewUrl } =
    params;

  const subject = `Score report needs review — ${tournamentName}`;

  const text = `
A player has submitted a match score for your review.

Tournament: ${tournamentName}
Category:   ${categoryName}
Round:      ${roundName}
Match:      ${playerA} vs ${playerB}
Score:      ${reportedScore}

Review and confirm: ${reviewUrl}

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

  <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px; display: flex; align-items: center; gap: 12px;">
    <p style="font-size: 24px; margin: 0;">⚠️</p>
    <div>
      <p style="font-size: 15px; font-weight: 700; color: #92400e; margin: 0;">Score report pending review</p>
      <p style="font-size: 13px; color: #b45309; margin: 4px 0 0;">A player has submitted a match result that needs your confirmation.</p>
    </div>
  </div>

  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 0 0 28px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #6b7280; width: 100px;">Tournament</td>
        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #111827;">${tournamentName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Category</td>
        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #111827;">${categoryName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Round</td>
        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #111827;">${roundName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Match</td>
        <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #111827;">${playerA} vs ${playerB}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Score</td>
        <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #7c3aed; font-family: monospace;">${reportedScore}</td>
      </tr>
    </table>
  </div>

  <div style="margin: 0 0 32px; text-align: center;">
    <a href="${reviewUrl}"
       style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px;
              border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">
      Review &amp; confirm score
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    You're receiving this as a tournament organiser on PLAYOFFE.
  </p>
</body>
</html>
`.trim();

  return { subject, html, text };
}
