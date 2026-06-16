import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient, createClient, getPlayerByUsername } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';
import { RatingChart } from '@/components/player/RatingChart';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `Stats · @${username} · PLAYOFFE` };
}

export default async function PlayerStatsPage({ params }: Props) {
  const { username } = await params;

  const supabase = await createClient();
  const admin = createAdminClient();

  let player;
  try {
    player = await getPlayerByUsername(username);
  } catch {
    notFound();
  }

  const stats = player.global_stats;

  // ── All match history for charting (up to 100 most recent, asc for chart) ──
  const { data: rawHistory } = await admin
    .from('match_history')
    .select('id, result, rating_before, rating_after, rating_change, played_at, tournament_id, opponent_entry_id')
    .eq('player_id', player.id)
    .order('played_at', { ascending: true })
    .limit(100);

  const history = (rawHistory ?? []).map((h) => ({
    id: h.id,
    result: h.result as string,
    rating_before: Number(h.rating_before),
    rating_after: Number(h.rating_after),
    rating_change: Number(h.rating_change),
    played_at: h.played_at as string,
    tournament_id: h.tournament_id as string,
    opponent_entry_id: h.opponent_entry_id as string | null,
  }));

  // ── H2H opponent breakdown ─────────────────────────────────────────────────
  const entryIds = history.map((h) => h.opponent_entry_id).filter(Boolean) as string[];
  const h2hOpponentMap = new Map<string, { playerId: string; wins: number; losses: number }>();

  if (entryIds.length > 0) {
    const { data: opponentEntries } = await admin
      .from('tournament_entries')
      .select('id, player_id, players!player_id(id, full_name, username)')
      .in('id', entryIds);

    for (const h of history) {
      if (!h.opponent_entry_id) continue;
      const entry = opponentEntries?.find((e) => e.id === h.opponent_entry_id);
      if (!entry) continue;
      const opPlayer = entry.players as { id: string; full_name: string; username: string } | null;
      if (!opPlayer) continue;
      const isWin = h.result === 'win' || h.result === 'walkover_win';
      const existing = h2hOpponentMap.get(opPlayer.id) ?? { playerId: opPlayer.id, wins: 0, losses: 0 };
      if (isWin) existing.wins++; else existing.losses++;
      h2hOpponentMap.set(opPlayer.id, existing);

      // Store name on the entry object for display
      (opPlayer as unknown as Record<string, unknown>)._stored = true;
    }

    // Attach player info to h2hOpponentMap values
    for (const entry of opponentEntries ?? []) {
      const opPlayer = entry.players as { id: string; full_name: string; username: string } | null;
      if (!opPlayer) continue;
      if (h2hOpponentMap.has(opPlayer.id)) {
        const rec = h2hOpponentMap.get(opPlayer.id)!;
        (rec as unknown as Record<string, string>).fullName = opPlayer.full_name;
        (rec as unknown as Record<string, string>).username = opPlayer.username;
      }
    }
  }

  const h2hOpponents = [...h2hOpponentMap.values()]
    .map((v) => ({
      ...v,
      fullName: (v as unknown as Record<string, string>).fullName ?? 'Unknown',
      username: (v as unknown as Record<string, string>).username ?? '',
      total: v.wins + v.losses,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ── Monthly win/loss aggregation ───────────────────────────────────────────
  const monthlyMap = new Map<string, { wins: number; losses: number }>();
  for (const h of history) {
    const month = h.played_at.slice(0, 7); // YYYY-MM
    if (!monthlyMap.has(month)) monthlyMap.set(month, { wins: 0, losses: 0 });
    const m = monthlyMap.get(month)!;
    if (h.result === 'win' || h.result === 'walkover_win') m.wins++;
    else m.losses++;
  }
  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // last 12 months
    .map(([month, counts]) => ({ month, ...counts }));

  // Recent form — last 20, reversed for display (most recent first)
  const recentForm = [...history].reverse().slice(0, 20);

  // ── Streak calculation ─────────────────────────────────────────────────────
  let currentStreak = 0;
  let streakType: 'W' | 'L' | null = null;
  for (const h of [...history].reverse()) {
    const isWin = h.result === 'win' || h.result === 'walkover_win';
    const type = isWin ? 'W' : 'L';
    if (streakType === null) { streakType = type; currentStreak = 1; }
    else if (type === streakType) currentStreak++;
    else break;
  }

  // ── Format win rates ───────────────────────────────────────────────────────
  const formats = stats ? [
    { label: 'Singles', matches: stats.singles_matches, wins: stats.singles_wins },
    { label: 'Doubles', matches: stats.doubles_matches, wins: stats.doubles_wins },
    { label: 'Mixed', matches: stats.mixed_doubles_matches, wins: stats.mixed_doubles_wins },
  ] : [];

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />

      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href={`/p/${username}`} className="hover:text-slate-300 transition-colors">
            @{username}
          </Link>
          <span>/</span>
          <span className="text-slate-400">Stats</span>
        </nav>

        {/* Tab nav */}
        <div className="mb-8 flex items-center gap-1 rounded-xl bg-surface-card p-1 ring-1 ring-surface-border w-fit">
          {[
            { label: 'Profile', href: `/p/${username}` },
            { label: 'Matches', href: `/p/${username}/matches` },
            { label: 'Stats', href: `/p/${username}/stats` },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab.label === 'Stats'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm font-medium text-white mb-1">No match data yet</p>
            <p className="text-xs text-slate-500">Stats will appear after completing rated matches.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key numbers */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Current rating" value={stats ? Number(stats.current_rating).toFixed(2) : '—'} accent />
              <StatCard label="Peak rating" value={stats ? Number(stats.peak_rating).toFixed(2) : '—'} />
              <StatCard label="Win rate" value={stats ? `${(Number(stats.win_rate) * 100).toFixed(0)}%` : '—'} />
              <StatCard
                label={streakType ? `${streakType === 'W' ? 'Win' : 'Loss'} streak` : 'Streak'}
                value={streakType ? `${currentStreak}${streakType}` : '—'}
                accent={streakType === 'W'}
              />
            </div>

            {/* Rating history chart */}
            <div className="rounded-2xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
              <div className="border-b border-surface-border px-5 py-4">
                <h2 className="text-sm font-semibold text-white">Rating history</h2>
                <p className="text-xs text-slate-500 mt-0.5">Last {history.length} rated matches</p>
              </div>
              <div className="px-5 py-5">
                <RatingChart history={history} />
              </div>
            </div>

            {/* Recent form */}
            <div className="rounded-2xl bg-surface-card ring-1 ring-surface-border px-5 py-5">
              <h2 className="text-sm font-semibold text-white mb-4">Recent form</h2>
              <div className="flex flex-wrap gap-1.5">
                {recentForm.map((h, i) => {
                  const isWin = h.result === 'win' || h.result === 'walkover_win';
                  const isWO = h.result === 'walkover_win' || h.result === 'walkover_loss';
                  return (
                    <div
                      key={h.id}
                      title={`${isWin ? 'Win' : 'Loss'}${isWO ? ' (walkover)' : ''} · ${h.rating_change >= 0 ? '+' : ''}${h.rating_change.toFixed(2)} · ${new Date(h.played_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
                      className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        isWin
                          ? 'bg-accent-500/20 text-accent-400'
                          : 'bg-red-500/15 text-red-400'
                      } ${i === 0 ? 'ring-2 ring-offset-1 ring-offset-surface-card' + (isWin ? ' ring-accent-500/50' : ' ring-red-500/40') : ''}`}
                    >
                      {isWO ? 'WO' : isWin ? 'W' : 'L'}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-600">Most recent on the left · hover for details</p>
            </div>

            {/* Monthly activity */}
            {monthly.length > 1 && (
              <div className="rounded-2xl bg-surface-card ring-1 ring-surface-border px-5 py-5">
                <h2 className="text-sm font-semibold text-white mb-5">Monthly activity</h2>
                <MonthlyBars monthly={monthly} />
              </div>
            )}

            {/* H2H opponent breakdown */}
            {h2hOpponents.length > 0 && (
              <div className="rounded-2xl bg-surface-card ring-1 ring-surface-border px-5 py-5">
                <h2 className="text-sm font-semibold text-white mb-4">Head-to-head records</h2>
                <div className="space-y-2">
                  {h2hOpponents.map((opp) => {
                    const winPct = opp.total > 0 ? (opp.wins / opp.total) * 100 : 0;
                    return (
                      <div key={opp.playerId} className="flex items-center gap-3">
                        <Link
                          href={`/p/${username}/h2h/${opp.username}`}
                          className="min-w-0 w-28 truncate text-xs font-medium text-slate-300 hover:text-brand-300 transition-colors"
                        >
                          {opp.fullName}
                        </Link>
                        <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden ring-1 ring-surface-border">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${winPct}%` }}
                          />
                        </div>
                        <span className="shrink-0 w-16 text-right text-xs text-slate-500 tabular-nums">
                          {opp.wins}W {opp.losses}L
                        </span>
                        <Link
                          href={`/p/${username}/h2h/${opp.username}`}
                          className="shrink-0 text-xs text-slate-600 hover:text-brand-400 transition-colors"
                          title="Full H2H record"
                        >
                          →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Format breakdown */}
            {formats.some((f) => f.matches > 0) && (
              <div className="rounded-2xl bg-surface-card ring-1 ring-surface-border px-5 py-5">
                <h2 className="text-sm font-semibold text-white mb-4">Win rate by format</h2>
                <div className="space-y-4">
                  {formats.filter((f) => f.matches > 0).map((f) => {
                    const rate = f.matches > 0 ? (f.wins / f.matches) * 100 : 0;
                    return (
                      <div key={f.label}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-400">{f.label}</span>
                          <span className="text-xs text-slate-500">
                            {f.wins}W / {f.matches - f.wins}L · {rate.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-surface overflow-hidden ring-1 ring-surface-border">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-4 text-center ring-1 ${accent ? 'bg-brand-900/40 ring-brand-700/50' : 'bg-surface-card ring-surface-border'}`}>
      <p className={`text-2xl font-bold tabular-nums ${accent ? 'text-brand-300' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function MonthlyBars({ monthly }: { monthly: { month: string; wins: number; losses: number }[] }) {
  const maxTotal = Math.max(...monthly.map((m) => m.wins + m.losses), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {monthly.map((m) => {
        const total = m.wins + m.losses;
        const heightPct = (total / maxTotal) * 100;
        const winPct = total > 0 ? (m.wins / total) * 100 : 0;
        const label = new Date(m.month + '-01').toLocaleDateString('en-AU', { month: 'short' });
        return (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${label}: ${m.wins}W ${m.losses}L`}>
            <div className="w-full flex flex-col justify-end rounded-sm overflow-hidden" style={{ height: `${heightPct}%`, minHeight: total > 0 ? '4px' : '0' }}>
              <div className="w-full bg-accent-500/40 rounded-sm" style={{ height: `${winPct}%` }} />
              <div className="w-full bg-red-500/30 rounded-sm" style={{ height: `${100 - winPct}%` }} />
            </div>
            <span className="text-[9px] text-slate-600">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
