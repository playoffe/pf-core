// Web-push notification sender for workers.
//
// Mirrors apps/web/src/lib/actions/push.ts — workers cannot import web app code.
// Reads VAPID keys from environment variables (same keys as the web app).
// Fire-and-forget: never throws, failures are logged only.

import webpush from 'web-push';
import { supabase } from './supabase.js';

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const pub   = process.env.VAPID_PUBLIC_KEY;
  const priv  = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!pub || !priv || !email) return; // VAPID not configured — no-op
  webpush.setVapidDetails(email.startsWith('mailto:') ? email : `mailto:${email}`, pub, priv);
  vapidConfigured = true;
}

/**
 * Sends a web-push notification to all subscriptions for a player.
 * No-ops if VAPID keys are not configured.
 */
export async function sendPushToPlayer(
  playerId: string,
  title: string,
  body: string,
  url = '/settings/social',
): Promise<void> {
  ensureVapid();
  if (!vapidConfigured) return; // VAPID not set up — silently skip

  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('player_id', playerId);

    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({ title, body, url });

    await Promise.allSettled(
      (subs as { endpoint: string; p256dh: string; auth: string }[]).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ),
      ),
    );
  } catch (err) {
    console.error('[push] sendPushToPlayer failed:', err);
  }
}
