import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { BADGE_MAP } from '@/lib/badges';

export const runtime = 'edge';

interface Params {
  params: Promise<{ username: string }>;
}

/**
 * GET /api/players/[username]/card.png
 * Generates a shareable player card OG image (1200×630).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  const admin = createAdminClient();

  const { data: player } = await admin
    .from('players')
    .select('id, full_name, username, location, photo_url, player_profiles(headline), global_stats(current_rating, wins, losses, total_matches, win_rate)')
    .eq('username', username)
    .maybeSingle();

  if (!player) {
    return new Response('Player not found', { status: 404 });
  }

  const { data: badgeRows } = await admin
    .from('player_badges')
    .select('badge_slug')
    .eq('player_id', player.id)
    .order('awarded_at', { ascending: true })
    .limit(5);

  const badges = (badgeRows ?? [])
    .map((b) => BADGE_MAP.get(b.badge_slug))
    .filter((d): d is NonNullable<typeof d> => d !== undefined);

  const stats = player.global_stats as {
    current_rating: number; wins: number; losses: number;
    total_matches: number; win_rate: number;
  } | null;
  const profile = player.player_profiles as { headline: string | null } | null;

  const rating = stats?.current_rating?.toFixed(2) ?? '–';
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const winRate = stats ? `${(stats.win_rate * 100).toFixed(0)}%` : '–';

  const e = React.createElement;

  // Stat box
  function statBox(label: string, value: string, highlight: boolean) {
    return e('div', {
      style: {
        flex: 1,
        borderRadius: '12px',
        padding: '16px',
        background: highlight ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
        border: highlight ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      },
    },
      e('div', { style: { fontSize: '28px', fontWeight: 700, color: highlight ? '#a5b4fc' : '#f1f5f9' } }, value),
      e('div', { style: { fontSize: '11px', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' } }, label),
    );
  }

  const avatarContent = player.photo_url
    ? e('img', { src: player.photo_url, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } })
    : e('span', { style: { fontSize: '52px', fontWeight: 700, color: '#a5b4fc' } }, player.full_name.charAt(0).toUpperCase());

  const image = e('div', {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      fontFamily: 'system-ui, sans-serif',
      padding: '60px',
      position: 'relative',
      overflow: 'hidden',
    },
  },
    // Background glow top-right
    e('div', {
      style: {
        position: 'absolute', top: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
      },
    }),
    // Background glow bottom-left
    e('div', {
      style: {
        position: 'absolute', bottom: '-80px', left: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
      },
    }),

    // Platform branding
    e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' } },
      e('div', {
        style: {
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        },
      }, '🎾'),
      e('span', { style: { color: '#94a3b8', fontSize: '16px', fontWeight: 600, letterSpacing: '0.1em' } }, 'PLAYOFFE'),
    ),

    // Main content row
    e('div', { style: { display: 'flex', flex: 1, gap: '60px', alignItems: 'center' } },

      // Left: avatar + name
      e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', minWidth: '200px' } },
        e('div', {
          style: {
            width: '120px', height: '120px', borderRadius: '60px', overflow: 'hidden',
            border: '3px solid rgba(99,102,241,0.6)',
            background: '#1e1b4b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          },
        }, avatarContent),
        e('div', { style: { textAlign: 'center' } },
          e('div', { style: { fontSize: '24px', fontWeight: 700, color: '#f8fafc', lineHeight: '1.2' } }, player.full_name),
          e('div', { style: { fontSize: '14px', color: '#64748b', marginTop: '4px' } }, `@${player.username}`),
          player.location
            ? e('div', { style: { fontSize: '13px', color: '#64748b', marginTop: '4px' } }, `📍 ${player.location}`)
            : null,
        ),
      ),

      // Right: stats + headline + badges
      e('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, gap: '24px' } },
        profile?.headline
          ? e('div', { style: { fontSize: '16px', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.4' } },
              `"${profile.headline}"`,
            )
          : null,

        // Stats row
        e('div', { style: { display: 'flex', gap: '16px' } },
          statBox('Rating', rating, true),
          statBox('Win Rate', winRate, false),
          statBox('Wins', wins.toString(), false),
          statBox('Matches', (wins + losses).toString(), false),
        ),

        // Badges
        badges.length > 0
          ? e('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              ...badges.map((def) =>
                e('div', {
                  key: def.slug,
                  style: {
                    display: 'flex', alignItems: 'center', gap: '6px',
                    borderRadius: '20px', padding: '6px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '13px', color: '#e2e8f0',
                  },
                },
                  e('span', { style: { fontSize: '16px' } }, def.icon),
                  e('span', {}, def.label),
                ),
              ),
            )
          : null,
      ),
    ),
  );

  return new ImageResponse(image, { width: 1200, height: 630 });
}
