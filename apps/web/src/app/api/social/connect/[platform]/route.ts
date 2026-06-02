import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// OAuth configuration — set these in .env.local / Vercel env vars:
//   INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET
//   FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET
//   X_CLIENT_ID, X_CLIENT_SECRET

const OAUTH_CONFIGS: Record<string, {
  authUrl: string;
  clientIdEnv: string;
  scope: string;
}> = {
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    clientIdEnv: 'INSTAGRAM_CLIENT_ID',
    scope: 'user_profile,user_media',
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    scope: 'pages_manage_posts,pages_read_engagement,publish_to_groups',
  },
  x: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    clientIdEnv: 'X_CLIENT_ID',
    scope: 'tweet.read tweet.write users.read offline.access',
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } },
) {
  const platform = params.platform;
  const config = OAUTH_CONFIGS[platform];

  if (!config) {
    return NextResponse.redirect(
      new URL('/settings/social?error=invalid_platform', req.url),
    );
  }

  // Check OAuth credentials are configured
  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/settings/social?error=not_configured&platform=${platform}`, req.url),
    );
  }

  // Require auth session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login?return=/settings/social', req.url));
  }

  // Build callback URL
  const callbackUrl = new URL(
    `/api/social/callback/${platform}`,
    process.env.NEXT_PUBLIC_APP_URL ?? req.url,
  ).toString();

  // Build state param (encode player_id for callback verification)
  const state = Buffer.from(JSON.stringify({ playerId: user.id, ts: Date.now() })).toString('base64url');

  // Build OAuth redirect
  const oauthUrl = new URL(config.authUrl);
  oauthUrl.searchParams.set('client_id', clientId);
  oauthUrl.searchParams.set('redirect_uri', callbackUrl);
  oauthUrl.searchParams.set('scope', config.scope);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('state', state);

  // X uses PKCE — add code challenge (simplified; production needs proper PKCE)
  if (platform === 'x') {
    oauthUrl.searchParams.set('code_challenge', 'challenge');
    oauthUrl.searchParams.set('code_challenge_method', 'plain');
  }

  return NextResponse.redirect(oauthUrl.toString());
}
