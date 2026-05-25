import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';
import { BADGE_MAP } from '@/lib/badges';

export const metadata: Metadata = { title: 'Activity Feed · PLAYOFFE' };

// ── Types ─────────────────────────────────────────────────────────────────────
type FeedItem =
  | { kind: 'match'; id: string; at: string; playerName: string; playerUsername: string; opponentName: string; result: string; tournamentName: string | null; ratingChange: number }
  | { kind: 'badge'; id: string; at: string; playerName: string; playerUsername: string; badgeSlug: string }
  | { kind: 'follow'; id: string; at: string; followerName: string; followerUsername: string; followingName: string; followingUsername: string };

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  // ── Fetch recent activity across the platform ─────────────────────────────
  const [matchesRes, badgesRes, followsRes] = await Promise.all([
    // Recent match results (last 50)
    admin
      .from('match_history')
      .select('id, player_id, result, rating_change, played_at, tournament_id, opponent_entry_id')
      .in('result', ['win', 'loss'])
      .order('played_at', { ascending: false })
      .limit(50),

    // Recent badges awarded (last 30)
    admin
      .from('player_badges')
      .select('id, player_id, badge_slug, awarded_at')
      .order('awarded_at', { ascending: false })
      .limit(30),

    // Recent follows (last 20)
    admin
      .from('player_follows')
      .select('id, follower_id, following_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // ── Collect all player IDs we need ───────────────────────────────────────
  const playerIds = new Set<string>();
  for (const m of matchesRes.data ?? []) playerIds.add(m.player_id);
  for (const b of badgesRes.data ?? []) playerIds.add(b.player_id);
  for (const f of followsRes.data ?? []) {
    playerIds.add(f.follower_id);
    playerIds.add(f.following_id);
  }

  const { data: players } = await admin
    .from('players')
    .select('id, full_name, username')
    .in('id', [...playerIds]);

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]));

  // ── Resolve opponent names for matches ───────────────────────────────────
  const entryIds = (matchesRes.data ?? [])
    .map((m) => m.opponent_entry_id)
    .filter(Boolean) as string[];

  let opponentMap = new Map<string, string>();
  if (entryIds.length > 0) {
    const { data: entries } = await admin
      .from('tournament_entries')
      .select('id, players!player_id(full_name)')
      .in('id', entryIds);
    opponentMap = new Map(
      (entries ?? []).map((e) => [
        e.id,
        (e.players as { full_name: string } | null)?.full_name ?? 'Unknown',
      ]),
    );
  }

  // ── Tournament names ─────────────────────────────────────────────────────
  const tournamentIds = [...new Set((matchesRes.data ?? []).map((m) => m.tournament_id))];
  const { data: tournaments } = await admin
    .from('tournaments')
    .select('id, name')
    .in('id', tournamentIds);
  const tournamentMap = new Map((tournaments ?? []).map((t) => [t.id, t.name]));

  // ── Build feed items ─────────────────────────────────────────────────────
  const items: FeedItem[] = [];

  for (const m of matchesRes.data ?? []) {
    const p = playerMap.get(m.player_id);
    if (!p) continue;
    items.push({
      kind: 'match',
      id: m.id,
      at: m.played_at,
      playerName: p.full_name,
      playerUsername: p.username,
      opponentName: m.opponent_entry_id ? (opponentMap.get(m.opponent_entry_id) ?? 'Unknown') : 'Unknown',
      result: m.result,
      tournamentName: m.tournament_id ? (tournamentMap.get(m.tournament_id) ?? null) : null,
      ratingChange: Number(m.rating_change),
    });
  }

  for (const b of badgesRes.data ?? []) {
    const p = playerMap.get(b.player_id);
    if (!p) continue;
    items.push({
      kind: 'badge',
      id: b.id,
      at: b.awarded_at,
      playerName: p.full_name,
      playerUsername: p.username,
      badgeSlug: b.badge_slug,
    });
  }

  for (const f of followsRes.data ?? []) {
    const follower = playerMap.get(f.follower_id);
    const following = playerMap.get(f.following_id);
    if (!follower || !following) continue;
    items.push({
      kind: 'follow',
      id: f.id,
      at: f.created_at,
      followerName: follower.full_name,
      followerUsername: follower.username,
      followingName: following.full_name,
      followingUsername: following.username,
    });
  }

  // Sort by time descending
  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const feed = items.slice(0, 60);

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />

      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-xl font-bold text-white">Activity Feed</h1>

        {feed.length === 0 ? (
          <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
            <p className="text-2xl mb-2">🎾</p>
            <p className="text-sm text-slate-500">No activity yet. Play some matches to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feed.map((item) => (
              <FeedCard key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Feed card ─────────────────────────────────────────────────────────────────
function FeedCard({ item }: { item: FeedItem }) {
  const timeAgo = formatTimeAgo(item.at);

  if (item.kind === 'match') {
    const isWin = item.result === 'win';
    const delta = item.ratingChange;
    const deltaStr = delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
    return (
      <div className="flex items-start gap-4 rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border">
        <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-bold ${isWin ? 'bg-accent-500/10 text-accent-400' : 'bg-red-500/10 text-red-400'}`}>
          {isWin ? 'W' : 'L'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300">
            <PlayerLink name={item.playerName} username={item.playerUsername} />{' '}
            {isWin ? 'beat' : 'lost to'}{' '}
            <span className="font-medium text-white">{item.opponentName}</span>
            {item.tournamentName && (
              <span className="text-slate-500"> · {item.tournamentName}</span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-xs font-bold tabular-nums ${delta > 0 ? 'text-accent-400' : delta < 0 ? 'text-red-400' : 'text-slate-500'}`}>
            {deltaStr}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo}</p>
        </div>
      </div>
    );
  }

  if (item.kind === 'badge') {
    const def = BADGE_MAP.get(item.badgeSlug);
    if (!def) return null;
    return (
      <div className="flex items-center gap-4 rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border">
        <span className="text-xl shrink-0">{def.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300">
            <PlayerLink name={item.playerName} username={item.playerUsername} />{' '}
            earned the{' '}
            <span className={`font-semibold ${def.color}`}>{def.label}</span> badge
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{def.description}</p>
        </div>
        <p className="shrink-0 text-[10px] text-slate-600">{timeAgo}</p>
      </div>
    );
  }

  // follow
  return (
    <div className="flex items-center gap-4 rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border">
      <span className="text-xl shrink-0">🤝</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300">
          <PlayerLink name={item.followerName} username={item.followerUsername} />{' '}
          started following{' '}
          <PlayerLink name={item.followingName} username={item.followingUsername} />
        </p>
      </div>
      <p className="shrink-0 text-[10px] text-slate-600">{timeAgo}</p>
    </div>
  );
}

function PlayerLink({ name, username }: { name: string; username: string }) {
  return (
    <Link href={`/p/${username}`} className="font-semibold text-white hover:text-brand-300 transition-colors">
      {name}
    </Link>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}
