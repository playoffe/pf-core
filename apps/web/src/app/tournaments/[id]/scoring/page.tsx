import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient, createAdminClient, getUserRoles } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';
import { RefereePinsPanel } from '@/components/tournaments/RefereePinsPanel';
import { PrintButton } from '@/components/ui/PrintButton';
import { DisputeQueue } from '@/components/scoring/DisputeQueue';
import { ScheduledMatchCard } from '@/components/scoring/ScheduledMatchCard';
import { CategoryFilter } from '@/components/scoring/CategoryFilter';

export const metadata: Metadata = { title: 'Scoring' };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; category?: string }>;
}

export default async function ScoringHubPage({ params, searchParams }: Props) {
  const { id: slug } = await params;
  const { date: dateFilter, category: categoryFilter } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  const { data: t } = await admin
    .from('tournaments')
    .select('id, name, club_id, start_date, end_date, court_count')
    .eq('slug', slug)
    .single();
  if (!t) notFound();

  const { data: mgr } = await admin
    .from('club_managers')
    .select('role')
    .eq('club_id', t.club_id)
    .eq('player_id', user.id)
    .maybeSingle();
  if (!mgr) notFound();

  // Mode guard
  const roles = getUserRoles(user);
  const isAdminRole = roles.includes('admin');
  const isPlayerRole = roles.includes('player') || roles.length === 0;
  const hasBothRoles = isAdminRole && isPlayerRole;
  const rawMode = (await cookies()).get('active_mode')?.value;
  const activeMode: 'admin' | 'player' = hasBothRoles
    ? (rawMode === 'player' ? 'player' : 'admin')
    : isAdminRole ? 'admin' : 'player';
  if (activeMode === 'player') redirect(`/events/${slug}`);

  const maxCourts = (t.court_count as number | null) ?? 10;

  // Referee PINs
  const { data: refPins } = await admin
    .from('tournament_referee_pins')
    .select('id, label, expires_at, is_revoked')
    .eq('tournament_id', t.id)
    .order('created_at', { ascending: false });

  // Active referee sessions
  const { data: refSessions } = await (admin
    .from('referee_sessions' as any)
    .select('id, referee_name, last_active_at, matches_scored_count')
    .eq('tournament_id', t.id)
    .eq('is_active', true)
    .order('last_active_at', { ascending: false })) as {
      data: Array<{ id: string; referee_name: string; last_active_at: string | null; matches_scored_count: number }> | null;
    };

  const activeReferees = refSessions ?? [];

  // All matches for this tournament (with both entries filled in)
  const { data: matches } = await admin
    .from('matches')
    .select(`
      id, round, round_name, group_name, status, court, scheduled_time, sets,
      assigned_referee_name,
      player_reported_winner_id, player_reported_sets,
      ea:tournament_entries!entry_a_id(id, seed, players!player_id(full_name), partner:players!partner_id(full_name)),
      eb:tournament_entries!entry_b_id(id, seed, players!player_id(full_name), partner:players!partner_id(full_name)),
      tc:tournament_categories!category_id(id, name, play_format)
    `)
    .eq('tournament_id', t.id)
    .not('entry_a_id', 'is', null)
    .not('entry_b_id', 'is', null)
    .order('status')
    .order('round')
    .order('court');

  type MatchRow = {
    id: string;
    round: number;
    round_name: string | null;
    group_name: string | null;
    status: string;
    court: number | null;
    scheduled_time: string | null;
    assigned_referee_name: string | null;
    sets: { set_number: number; score_a: number; score_b: number }[];
    player_reported_winner_id: string | null;
    player_reported_sets: unknown;
    ea: { id: string; seed: number | null; players: { full_name: string } | null; partner: { full_name: string } | null } | null;
    eb: { id: string; seed: number | null; players: { full_name: string } | null; partner: { full_name: string } | null } | null;
    tc: { id: string; name: string; play_format: string } | null;
  };

  const allRows = (matches ?? []) as unknown as MatchRow[];

  // ── Extract unique categories from matches ────────────────────────────────
  const categoryMap = new Map<string, string>();
  for (const m of allRows) {
    if (m.tc?.id && m.tc?.name) categoryMap.set(m.tc.id, m.tc.name);
  }
  const categories = [...categoryMap.entries()].map(([id, name]) => ({ id, name }));

  // ── Category filter ───────────────────────────────────────────────────────
  const filteredByCategory = categoryFilter
    ? allRows.filter((m) => m.tc?.id === categoryFilter)
    : allRows;

  // ── Multi-day grouping ────────────────────────────────────────────────────
  const allDates = [...new Set(
    filteredByCategory
      .filter((m) => m.scheduled_time)
      .map((m) => m.scheduled_time!.slice(0, 10)),
  )].sort();

  const isMultiDay = allDates.length > 1;
  const activeDate = isMultiDay ? (dateFilter ?? allDates[0] ?? null) : null;

  const rows = activeDate
    ? filteredByCategory.filter((m) => {
        if (!m.scheduled_time) return m.status === 'in_progress';
        return m.scheduled_time.slice(0, 10) === activeDate;
      })
    : filteredByCategory;

  const live = rows.filter((m) => m.status === 'in_progress');
  const scheduled = rows.filter((m) => m.status === 'scheduled');
  const done = rows.filter((m) => m.status === 'completed' || m.status === 'walkover');

  // Player-reported matches pending review (across all categories)
  const pendingReport = allRows.filter(
    (m) => m.player_reported_winner_id && m.status !== 'completed' && m.status !== 'walkover',
  );

  function entryTeamName(entry: MatchRow['ea'], playFormat?: string | null): string {
    if (!entry?.players) return 'TBD';
    const isDoubles = playFormat === 'doubles' || playFormat === 'mixed_doubles';
    if (isDoubles && entry.partner) return `${entry.players.full_name} / ${entry.partner.full_name}`;
    return entry.players.full_name;
  }

  const disputeMatches = pendingReport.map((m) => {
    const aName = entryTeamName(m.ea, m.tc?.play_format);
    const bName = entryTeamName(m.eb, m.tc?.play_format);
    const reportedWinnerName =
      m.player_reported_winner_id === m.ea?.id ? aName
      : m.player_reported_winner_id === m.eb?.id ? bName
      : 'Unknown';
    const reportedSetsArr = Array.isArray(m.player_reported_sets)
      ? (m.player_reported_sets as { score_a: number; score_b: number }[])
      : [];
    return {
      id: m.id,
      tournamentSlug: slug,
      categoryName: m.tc?.name ?? '',
      roundLabel: m.round_name ?? `Round ${m.round}`,
      playerA: aName,
      playerB: bName,
      reportedWinnerName,
      reportedSets: reportedSetsArr.map((s) => `${s.score_a}-${s.score_b}`).join(', '),
    };
  });

  function CompletedMatchCard({ match }: { match: MatchRow }) {
    const aName = entryTeamName(match.ea, match.tc?.play_format);
    const bName = entryTeamName(match.eb, match.tc?.play_format);
    const sets = match.sets as { score_a: number; score_b: number }[] ?? [];
    const scoreStr = sets.length > 0 ? sets.map((s) => `${s.score_a}-${s.score_b}`).join(', ') : null;
    const hasReport = !!match.player_reported_winner_id;

    return (
      <Link
        href={`/tournaments/${slug}/scoring/${match.id}`}
        className={`flex items-center gap-4 rounded-xl px-5 py-3.5 ring-1 transition-all hover:ring-brand-500/30 ${
          hasReport
            ? 'bg-amber-950/20 ring-amber-700/40'
            : 'bg-surface-card ring-surface-border'
        }`}
      >
        <div className="w-14 shrink-0 text-center">
          {match.court && (
            <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-mono text-slate-600">
              Ct {match.court}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-400 truncate">
            {aName}<span className="mx-2 text-slate-700">vs</span>{bName}
          </p>
          <p className="text-xs text-slate-600 mt-0.5 truncate">
            {match.tc?.name ?? ''}{match.round_name ? ` · ${match.round_name}` : ''}
            {match.group_name ? ` · ${match.group_name}` : ''}
          </p>
        </div>
        {scoreStr && <span className="text-xs font-mono text-slate-600 shrink-0">{scoreStr}</span>}
        <span className="shrink-0 text-xs text-slate-600">
          {match.status === 'walkover' ? 'W/O' : 'Done'}
        </span>
        <span className="text-slate-700 shrink-0">›</span>
      </Link>
    );
  }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href={`/tournaments/${slug}`} className="hover:text-slate-300 transition-colors">
            {t.name}
          </Link>
          <span>/</span>
          <span className="text-slate-400">Scoring</span>
        </nav>

        {/* Page header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-white">Match scoring</h1>
          <div className="flex items-center gap-3">
            <PrintButton label="Print schedule" />
            {pendingReport.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                {pendingReport.length} report{pendingReport.length !== 1 ? 's' : ''} pending
              </span>
            )}
          </div>
        </div>

        {/* ── Category filter ───────────────────────────────────────────────── */}
        {categories.length > 1 && (
          <div className="mb-5">
            <CategoryFilter
              categories={categories}
              activeCategoryId={categoryFilter ?? null}
            />
          </div>
        )}

        {/* ── Active referees strip ─────────────────────────────────────────── */}
        <div className="mb-6 rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Active referees
              </p>
              {activeReferees.length === 0 ? (
                <p className="text-xs text-slate-600">
                  No referees online. Generate a PIN so a referee can check in at{' '}
                  <a href="/ref" target="_blank" className="text-brand-400 hover:underline">
                    playoffe.com/ref
                  </a>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeReferees.map((r) => (
                    <span
                      key={r.id}
                      className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-surface-border"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-400 shrink-0" />
                      {r.referee_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <a
              href="#referee-pins"
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors shrink-0"
            >
              Manage PINs ↓
            </a>
          </div>
        </div>

        {/* Multi-day date picker */}
        {isMultiDay && (
          <div className="mb-6 flex flex-wrap gap-2">
            {allDates.map((d) => (
              <Link
                key={d}
                href={`/tournaments/${slug}/scoring?${categoryFilter ? `category=${categoryFilter}&` : ''}date=${d}`}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activeDate === d
                    ? 'bg-brand-600 text-white'
                    : 'border border-surface-border text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {formatDate(d)}
              </Link>
            ))}
            <Link
              href={`/tournaments/${slug}/scoring${categoryFilter ? `?category=${categoryFilter}` : ''}`}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                !dateFilter
                  ? 'bg-brand-600 text-white'
                  : 'border border-surface-border text-slate-400 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              All days
            </Link>
          </div>
        )}

        {/* Dispute queue */}
        <DisputeQueue matches={disputeMatches} tournamentSlug={slug} />

        {/* ── Live matches ──────────────────────────────────────────────────── */}
        {live.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-400">
              Live now — {live.length} match{live.length !== 1 ? 'es' : ''}
            </h2>
            <div className="space-y-3">
              {live.map((m) => (
                <ScheduledMatchCard
                  key={m.id}
                  matchId={m.id}
                  tournamentSlug={slug}
                  status="in_progress"
                  categoryName={m.tc?.name ?? ''}
                  roundLabel={m.round_name ?? `Round ${m.round}`}
                  groupName={m.group_name}
                  scheduledTime={m.scheduled_time}
                  court={m.court}
                  assignedRefereeName={m.assigned_referee_name}
                  maxCourts={maxCourts}
                  entryA={m.ea}
                  entryB={m.eb}
                  playFormat={m.tc?.play_format ?? 'singles'}
                  activeReferees={activeReferees}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Scheduled matches ─────────────────────────────────────────────── */}
        {scheduled.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Upcoming — {scheduled.length}
              </h2>
              {activeReferees.length === 0 && (
                <span className="text-[11px] text-slate-600">
                  No referees online — type a name to assign
                </span>
              )}
            </div>
            <div className="space-y-3">
              {scheduled.map((m) => (
                <ScheduledMatchCard
                  key={m.id}
                  matchId={m.id}
                  tournamentSlug={slug}
                  status="scheduled"
                  categoryName={m.tc?.name ?? ''}
                  roundLabel={m.round_name ?? `Round ${m.round}`}
                  groupName={m.group_name}
                  scheduledTime={m.scheduled_time}
                  court={m.court}
                  assignedRefereeName={m.assigned_referee_name}
                  maxCourts={maxCourts}
                  entryA={m.ea}
                  entryB={m.eb}
                  playFormat={m.tc?.play_format ?? 'singles'}
                  activeReferees={activeReferees}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Completed matches ─────────────────────────────────────────────── */}
        {done.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-600">
              Completed — {done.length}
            </h2>
            <div className="space-y-2">
              {done.map((m) => <CompletedMatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {rows.length === 0 && (
          <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
            <p className="text-2xl mb-2">🎾</p>
            <p className="text-sm font-medium text-white mb-1">
              {categoryFilter
                ? 'No matches in this category yet'
                : activeDate ? `No matches on ${formatDate(activeDate)}` : 'No matches yet'}
            </p>
            <p className="text-xs text-slate-500">
              Generate a draw for at least one category to start scoring.
            </p>
          </div>
        )}

        {/* ── Referee PIN management ────────────────────────────────────────── */}
        <div id="referee-pins" className="mt-10" data-print-hide>
          <RefereePinsPanel
            tournamentId={t.id}
            pins={(refPins ?? []).map((p) => ({
              id: p.id,
              label: p.label as string | null,
              expires_at: p.expires_at as string,
              is_revoked: p.is_revoked as boolean,
            }))}
            initialSessions={activeReferees}
          />
        </div>
      </main>
    </div>
  );
}
