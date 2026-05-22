/**
 * Email service — routes through:
 *  Development  →  Mailpit SMTP (localhost:54325, port from supabase/config.toml)
 *  Production   →  Amazon SES via @aws-sdk/client-ses
 *
 * Required env vars for SES (production only):
 *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM_EMAIL
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendViaSES(payload: EmailPayload): Promise<void> {
  const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

  const client = new SESClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  await client.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL ?? 'noreply@pickleballplatform.com',
      Destination: { ToAddresses: [payload.to] },
      Message: {
        Subject: { Data: payload.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: payload.html, Charset: 'UTF-8' },
          Text: { Data: payload.text, Charset: 'UTF-8' },
        },
      },
    }),
  );
}

async function sendViaMailpit(payload: EmailPayload): Promise<void> {
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.default.createTransport({
    host: '127.0.0.1',
    port: 54325,
    secure: false,
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: 'Pickleball Platform <noreply@localhost>',
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const isProduction =
    process.env.NODE_ENV === 'production' &&
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.SES_FROM_EMAIL;

  if (isProduction) {
    await sendViaSES(payload);
    return;
  }

  // Local / staging: try Mailpit, fall back to console.log
  try {
    await sendViaMailpit(payload);
    console.log(`[email] Sent to ${payload.to} via Mailpit: ${payload.subject}`);
  } catch {
    // Mailpit not available — just log the email for debugging
    console.log('[email] Mailpit unavailable, logging email:');
    console.log(`  To:      ${payload.to}`);
    console.log(`  Subject: ${payload.subject}`);
    console.log(`  Text:    ${payload.text}`);
  }
}
