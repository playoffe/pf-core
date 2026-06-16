import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient, createClient, getCurrentUser } from '@/lib/supabase/server';

// Same OAuth configs as player flow — same developer apps
const OAUTH_CONFIGS = {
  instagram: {
    authUrl:      'https://api.instagram.com/oauth/authorize',
    clientIdEnv:  'INSTAGRAM_CLIENT_ID',
    scope:        'user_profile,user_media',
    usesPkce:     false,
  },
  facebook: {
    authUrl:      'https://www.facebook.com/v19.0/dialog/oauth',
    clientIdEnv:  'FACEBOOK_CLIENT_ID',
    scope:        'public_profile,pages_manage_posts,pages_read_engagement',
    usesPkce:     false,
  },
  x: {
    authUrl:      'https://twitter.com/i/oauth2/authorize',
    clientIdEnv:  'X_CLIENT_ID',
    scope:        'tweet.read tweet.write users.read offline.access',
    usesPkce:     true,
  },
} as const;

type SupportedPlatform = keyof typeof OAUTH_CONFIGS;

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } },
) {
  const { platform } = params;
  const url = new URL(req.url);
  const clubSlug = url.searchParams.get('club');

  if (!(platform in OAUTH_CONFIGS)) {
    return NextResponse.redirect(new URL('/settings/profile?error=invalid_platform', req.url));
  }

  if (!clubSlug) {
    return NextResponse.redirect(new URL('/settings/profile?error=missing_club', req.url));
  }

  const config    = OAUTH_CONFIGS[platform as SupportedPlatform];
  const clientId  = process.env[config.clientIdEnv];

  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/clubs/${clubSlug}/settings?error=not_configured&platform=${platform}`, req.url),
    );
  }

  // Require authenticated session + club manager role
  const supabase  = await createClient();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?return=/clubs/${clubSlug}/settings`, req.url));
  }

  const admin = createAdminClient();
  const { data: club } = await admin
    .from('clubs')
    .select('id')
    .eq('slug', clubSlug)
    .single();

  if (!club) {
    return NextResponse.redirect(new URL('/settings/profile?error=club_not_found', req.url));
  }

  const { data: mgr } = await admin
    .from('club_managers')
    .select('role')
    .eq('club_id', club.id)
    .eq('player_id', user.id)
    .maybeSingle();

  if (!mgr) {
    return NextResponse.redirect(new URL(`/clubs/${clubSlug}/settings?error=permission_denied`, req.url));
  }

  const appUrl      = (process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')!}`).replace(/\/$/, '');
  const callbackUrl = `${appUrl}/api/social/club/callback/${platform}`;

  // State includes clubId so the callback can look up the club
  const state = Buffer.from(
    JSON.stringify({ clubId: club.id, clubSlug, userId: user.id, ts: Date.now() }),
  ).toString('base64url');

  const oauthUrl = new URL(config.authUrl);
  oauthUrl.searchParams.set('client_id',    clientId);
  oauthUrl.searchParams.set('redirect_uri', callbackUrl);
  oauthUrl.searchParams.set('scope',        config.scope);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('state',        state);

  let codeVerifier: string | null = null;
  if (config.usesPkce) {
    codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    oauthUrl.searchParams.set('code_challenge',        codeChallenge);
    oauthUrl.searchParams.set('code_challenge_method', 'S256');
  }

  const response = NextResponse.redirect(oauthUrl.toString());

  if (codeVerifier) {
    response.cookies.set(`pkce_club_${platform}`, codeVerifier, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   600,
      path:     '/',
    });
  }

  return response;
}
