import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient, createClient, getPlayerByUsername } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';

interface Props {
  params: Promise<{ username: string; opponent: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, opponent } = await params;
  return { title: `H2H: @${username} vs @${opponent} · PLAYOFFE` };
}

export default async function H2HPage({ params }: Props) {
  const { username, opponent: opponentUsername } = await params;

  const supabase = await createClient();
  const admin = createAdminClient();

  // Fetch both players
  let playerA, playerB;
  try {
    [playerA, playerB] = await Promise.all([
      getPlayerByUsername(username),
      getPlayerByUsername(opponentUsername),
    ]);
  } catch {
    notFound();
  }

  // ── Find shared match IDs ─────────────────────────────────────────────────
  // Get all match_ids for player A
  const { data: aHistory } = await admin
    .from('match_history')
    .select('match_id, result, sets, rating_change, played_at, tournament_id')
    .eq('player_id', playerA.id)
    .in('result', ['win', 'loss', 'walkover_win', 'walkover_loss'])
    .order('played_at', { ascending: false })
    .limit(200);

  const aMatchIds = (aHistory ?? []).map((h) => h.match_id);

  // Find player B's history entries for those same matches
  const { data: bHistory } = await admin
    .from('match_history')
    .select('match_id, result, played_at, tournament_id')
    .eq('player_id', playerB.id)
    .in('match_id', aMatchIds.length > 0 ? aMatchIds : ['00000000-0000-0000-0000-000000000000']);

  const sharedMatchIds = new Set((bHistory ?? []).map((h) => h.match_id));

  // Filter A's history to only shared matches
  const sharedMatches = (aHistory ?? []).filter((h) => sharedMatchIds.has(h.match_id));

  // Build H2H records
  let aWins = 0, bWins = 0;
  const matchRecords: Array<{
    matchId: string;
    aWon: boolean;
    sets: { set_number: number; score_a: number; score_b: number }[];
    ratingChange: number;
    playedAt: string;
    tournamentId: string;
  }> = [];

  const bMatchMap = new Map((bHistory ?? []).map((h) => [h.match_id, h]));

  for (const m of sharedMatches) {
    const aWon = m.result === 'win' || m.result === 'walkover_win';
    if (aWon) aWins++; else bWins++;
    matchRecords.push({
      matchId: m.match_id,
      aWon,
      sets: (m.sets as { set_number: number; score_a: number; score_b: number }[]) ?? [],
      ratingChange: Number(m.rating_change),
      playedAt: m.played_at,
      tournamentId: m.tournament_id,
    });
  }

  // Fetch tournament names
  const tournamentIds = [...new Set(matchRecords.map((m) => m.tournamentId))];
  const { data: tournaments } = await admin
    .from('tournaments')
    .select('id, name, slug')
    .in('id', tournamentIds);
  const tournamentMap = new Map((tournaments ?? []).map((t) => [t.id, t]));

  const totalMatches = aWins + bWins;
  const aWinPct = totalMatches > 0 ? Math.round((aWins / totalMatches) * 100) : 0;
  const bWinPct = totalMatches > 0 ? Math.round((bWins / totalMatches) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />

      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500 flex-wrap">
          <Link href={`/p/${username}`} className="hover:text-slate-300 transition-colors">@{username}</Link>
          <span>/</span>
          <span className="text-slate-400">Head-to-Head</span>
          <span>/</span>
          <Link href={`/p/${opponentUsername}`} className="hover:text-slate-300 transition-colors">@{opponentUsername}</Link>
        </nav>

        {/* H2H header */}
        <div className="rounded-2xl bg-surface-card ring-1 ring-surface-border overflow-hidden mb-6">
          <div className="grid grid-cols-3 items-center gap-4 px-6 py-6">
            {/* Player A */}
            <div className="text-center">
              <p className="text-lg font-bold text-white">{playerA.full_name}</p>
              <Link href={`/p/${username}`} className="text-xs text-slate-500 hover:text-brand-300">@{username}</Link>
              <p className="mt-3 text-4xl font-black tabular-nums text-white">{aWins}</p>
              <p className="text-xs text-slate-500">wins</p>
              {totalMatches > 0 && (
                <p className="mt-1 text-sm font-semibold text-brand-300">{aWinPct}%</p>
              )}
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="text-2xl font-black text-slate-600">VS</div>
              <div className="mt-2 text-xs text-slate-600">{totalMatches} match{totalMatches !== 1 ? 'es' : ''}</div>
              {totalMatches > 0 && (
                <div className="mt-3 h-2 rounded-full bg-surface overflow-hidden ring-1 ring-surface-border flex">
                  <div className="bg-brand-500 h-full" style={{ width: `${aWinPct}%` }} />
                  <div className="bg-red-500/60 h-full" style={{ width: `${bWinPct}%` }} />
                </div>
              )}
            </div>

            {/* Player B */}
            <div className="text-center">
              <p className="text-lg font-bold text-white">{playerB.full_name}</p>
              <Link href={`/p/${opponentUsername}`} className="text-xs text-slate-500 hover:text-brand-300">@{opponentUsername}</Link>
              <p className="mt-3 text-4xl font-black tabular-nums text-white">{bWins}</p>
              <p className="text-xs text-slate-500">wins</p>
              {totalMatches > 0 && (
                <p className="mt-1 text-sm font-semibold text-red-400">{bWinPct}%</p>
              )}
            </div>
          </div>
        </div>

        {/* Match history */}
        {matchRecords.length === 0 ? (
          <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
            <p className="text-2xl mb-2">🎾</p>
            <p className="text-sm text-slate-500">These players have not faced each other yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Match history</h2>
            {matchRecords.map((m) => {
              const tournament = tournamentMap.get(m.tournamentId);
              const scoreStr = m.sets.length > 0
                ? m.sets.map((s) => `${s.score_a}-${s.score_b}`).join(', ')
                : null;
              const date = new Date(m.playedAt).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              return (
                <div
                  key={m.matchId}
                  className="flex items-center gap-4 rounded-xl bg-surface-card px-5 py-3.5 ring-1 ring-surface-border"
                >
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                      m.aWon
                        ? 'bg-accent-500/10 text-accent-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {m.aWon ? `${playerA.full_name.split(' ')[0]} won` : `${playerB.full_name.split(' ')[0]} won`}
                  </span>

                  <div className="flex-1 min-w-0">
                    {tournament && (
                      <p className="text-xs text-slate-500 truncate">{tournament.name}</p>
                    )}
                    {scoreStr && (
                      <p className="text-sm font-medium text-slate-300 tabular-nums">{scoreStr}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-bold tabular-nums ${m.ratingChange > 0 ? 'text-accent-400' : m.ratingChange < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {m.ratingChange >= 0 ? `+${m.ratingChange.toFixed(2)}` : m.ratingChange.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-600">{date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
