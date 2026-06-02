import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertSocialConnectionAction } from '@/lib/actions/social';
import type { OAuthPlatform } from '@/lib/social-types';

// TODO Phase 11B: implement token exchange per platform.
// Each platform has a different token endpoint + user-info endpoint.
// This stub validates the callback, exchanges the code, and stores the token.

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } },
) {
  const platform = params.platform as OAuthPlatform;
  const url = new URL(req.url);
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // OAuth error from provider
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/social?error=${encodeURIComponent(error)}`, req.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings/social?error=missing_code', req.url),
    );
  }

  // Decode state + verify session
  let statePayload: { playerId: string; ts: number };
  try {
    statePayload = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    return NextResponse.redirect(
      new URL('/settings/social?error=invalid_state', req.url),
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== statePayload.playerId) {
    return NextResponse.redirect(
      new URL('/settings/social?error=session_mismatch', req.url),
    );
  }

  // ── TODO Phase 11B: exchange code for token ────────────────────────────────
  // For each platform:
  //   1. POST to token endpoint with code + client_secret
  //   2. Fetch user info (display name, username, platform_user_id)
  //   3. Call upsertSocialConnectionAction with real data
  //
  // Instagram: POST https://api.instagram.com/oauth/access_token
  // Facebook:  POST https://graph.facebook.com/v19.0/oauth/access_token
  // X:         POST https://api.twitter.com/2/oauth2/token
  //
  // For now: store a placeholder so the connection tile shows as connected
  // while the token exchange is built out.
  // ────────────────────────────────────────────────────────────────────────────

  const result = await upsertSocialConnectionAction({
    playerId:             user.id,
    platform,
    platformUserId:       'pending',
    platformUsername:     null,
    platformDisplayName:  null,
    accessToken:          'placeholder', // replace with real token
    refreshToken:         null,
    tokenExpiresAt:       null,
    scopes:               [],
  });

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/settings/social?error=${encodeURIComponent(result.error)}`, req.url),
    );
  }

  return NextResponse.redirect(
    new URL(`/settings/social?connected=${platform}`, req.url),
  );
}
