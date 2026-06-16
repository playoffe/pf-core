import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

// ── Per-platform OAuth configuration ─────────────────────────────────────────

const OAUTH_CONFIGS = {
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    clientIdEnv: 'INSTAGRAM_CLIENT_ID',
    scope: 'user_profile,user_media',
    usesPkce: false,
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    // public_profile needed for user info; pages_* for posting to pages
    scope: 'public_profile,pages_manage_posts,pages_read_engagement',
    usesPkce: false,
  },
  x: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    clientIdEnv: 'X_CLIENT_ID',
    scope: 'tweet.read tweet.write users.read offline.access',
    usesPkce: true,
  },
} as const;

type SupportedPlatform = keyof typeof OAUTH_CONFIGS;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } },
) {
  const { platform } = params;

  if (!(platform in OAUTH_CONFIGS)) {
    return NextResponse.redirect(
      new URL('/settings/social?error=invalid_platform', req.url),
    );
  }

  const config = OAUTH_CONFIGS[platform as SupportedPlatform];
  const clientId = process.env[config.clientIdEnv];

  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/settings/social?error=not_configured&platform=${platform}`, req.url),
    );
  }

  // Require authenticated session
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login?return=/settings/social', req.url));
  }

  // Callback URL — always use the env-configured app URL so it matches what
  // is registered in the developer console
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')!}`).replace(/\/$/, '');
  const callbackUrl = `${appUrl}/api/social/callback/${platform}`;

  // State param — encodes player ID + timestamp for CSRF / session binding
  const state = Buffer.from(
    JSON.stringify({ playerId: user.id, ts: Date.now() }),
  ).toString('base64url');

  // Build authorization URL
  const oauthUrl = new URL(config.authUrl);
  oauthUrl.searchParams.set('client_id', clientId);
  oauthUrl.searchParams.set('redirect_uri', callbackUrl);
  oauthUrl.searchParams.set('scope', config.scope);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('state', state);

  // PKCE — X requires code_challenge
  let codeVerifier: string | null = null;
  if (config.usesPkce) {
    codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    oauthUrl.searchParams.set('code_challenge', codeChallenge);
    oauthUrl.searchParams.set('code_challenge_method', 'S256');
  }

  const response = NextResponse.redirect(oauthUrl.toString());

  // Store code_verifier in a short-lived HttpOnly cookie so the callback can read it
  if (codeVerifier) {
    response.cookies.set(`pkce_${platform}`, codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes — enough for the OAuth round-trip
      path: '/',
    });
  }

  return response;
}
