import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: club } = await admin
    .from('clubs')
    .select('name, description')
    .eq('slug', slug)
    .single();
  if (!club) return { title: 'Club not found' };
  return {
    title: club.name,
    description: club.description ?? `${club.name} on PLAYOFFE`,
  };
}

export default async function PublicClubPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();

  // Fetch club
  const { data: club } = await admin
    .from('clubs')
    .select('id, name, slug, description, city, location, brand_primary_color, website')
    .eq('slug', slug)
    .single();
  if (!club) notFound();

  // Fetch all tournaments for this club (not draft)
  const { data: tournaments } = await admin
    .from('tournaments')
    .select('id, name, slug, status, start_date, end_date, venue, max_participants')
    .eq('club_id', club.id)
    .neq('status', 'draft')
    .order('start_date', { ascending: false });

  const allTournaments = tournaments ?? [];

  // Split into upcoming/active and past
  const activeTournaments = allTournaments.filter((t) =>
    ['registration_open', 'in_progress'].includes(t.status),
  );
  const upcomingTournaments = activeTournaments; // already filtered
  const pastTournaments = allTournaments
    .filter((t) => t.status === 'completed')
    .slice(0, 6);

  // Fetch top members: players who have competed in this club's tournaments,
  // ordered by current rating, top 10
  const tournamentIds = allTournaments.map((t) => t.id);

  type TopPlayer = {
    player_id: string;
    players: {
      id: string;
      full_name: string;
      username: string;
      global_stats: { current_rating: number; wins: number; losses: number } | null;
    } | null;
  };

  let topPlayers: TopPlayer[] = [];

  if (tournamentIds.length > 0) {
    const { data: entries } = await admin
      .from('tournament_entries')
      .select(`
        player_id,
        players!player_id(id, full_name, username, global_stats(current_rating, wins, losses))
      `)
      .in('tournament_id', tournamentIds)
      .eq('status', 'active');

    // Deduplicate by player_id, keep highest-rated
    const seen = new Map<string, TopPlayer>();
    for (const e of (entries ?? []) as unknown as TopPlayer[]) {
      if (!e.player_id || seen.has(e.player_id)) continue;
      seen.set(e.player_id, e);
    }

    topPlayers = [...seen.values()]
      .filter((e) => e.players?.global_stats)
      .sort(
        (a, b) =>
          (b.players?.global_stats?.current_rating ?? 0) -
          (a.players?.global_stats?.current_rating ?? 0),
      )
      .slice(0, 10);
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    registration_open: { label: 'Registration open', color: 'text-blue-300 bg-blue-900/40' },
    in_progress: { label: 'In progress', color: 'text-accent-400 bg-accent-500/20' },
    completed: { label: 'Completed', color: 'text-brand-300 bg-brand-600/20' },
  };

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Club header */}
        <div className="mb-10 flex items-start gap-5">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg"
            style={{ backgroundColor: club.brand_primary_color ?? '#7c3aed' }}
          >
            {club.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white">{club.name}</h1>
            {(club.city || club.location) && (
              <p className="mt-1 text-sm text-slate-400">
                📍 {[club.city, club.location].filter(Boolean).join(', ')}
              </p>
            )}
            {club.website && (
              <a
                href={club.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                {club.website.replace(/^https?:\/\//, '')} ↗
              </a>
            )}
            {club.description && (
              <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-2xl">
                {club.description}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column: Tournaments */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming & Active */}
            {upcomingTournaments.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Upcoming &amp; Active
                </h2>
                <div className="space-y-3">
                  {upcomingTournaments.map((t) => {
                    const cfg = statusConfig[t.status] ?? statusConfig.completed;
                    return (
                      <Link
                        key={t.id}
                        href={`/events/${t.slug}`}
                        className="flex items-center justify-between rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border hover:ring-brand-500/40 transition-all group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                            {t.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(t.start_date).toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {t.end_date && t.end_date !== t.start_date &&
                              ` – ${new Date(t.end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            {t.venue ? ` · ${t.venue}` : ''}
                          </p>
                        </div>
                        <span
                          className={`ml-4 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Past tournaments */}
            {pastTournaments.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Past Tournaments
                </h2>
                <div className="space-y-2">
                  {pastTournaments.map((t) => (
                    <Link
                      key={t.id}
                      href={`/events/${t.slug}`}
                      className="flex items-center justify-between rounded-xl bg-surface-card/60 px-5 py-3 ring-1 ring-surface-border hover:ring-brand-500/40 transition-all group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">
                          {t.name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {new Date(t.start_date).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="ml-4 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-brand-300 bg-brand-600/20">
                        Completed
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {allTournaments.length === 0 && (
              <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
                <p className="text-sm text-slate-500">No public tournaments yet.</p>
              </div>
            )}
          </div>

          {/* Right column: Leaderboard */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Top Members
            </h2>
            {topPlayers.length === 0 ? (
              <div className="rounded-xl bg-surface-card p-6 text-center ring-1 ring-surface-border">
                <p className="text-xs text-slate-500">No rated players yet.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
                {topPlayers.map((entry, i) => {
                  const p = entry.players!;
                  const stats = p.global_stats!;
                  const total = (stats.wins ?? 0) + (stats.losses ?? 0);
                  const winPct = total > 0 ? Math.round(((stats.wins ?? 0) / total) * 100) : null;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <Link
                      key={p.id}
                      href={`/p/${p.username}`}
                      className="flex items-center gap-3 px-4 py-3 border-b border-surface-border last:border-0 hover:bg-surface transition-colors"
                    >
                      <span className="w-6 text-center text-sm">
                        {i < 3 ? medals[i] : <span className="text-slate-600 text-xs">#{i + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.full_name}</p>
                        <p className="text-xs text-slate-500">@{p.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {stats.current_rating.toFixed(2)}
                        </p>
                        {winPct !== null && (
                          <p className="text-xs text-slate-500">{winPct}% wins</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Stats summary */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-card px-4 py-3 ring-1 ring-surface-border text-center">
                <p className="text-xl font-bold text-white">{allTournaments.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Tournaments</p>
              </div>
              <div className="rounded-xl bg-surface-card px-4 py-3 ring-1 ring-surface-border text-center">
                <p className="text-xl font-bold text-white">{topPlayers.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Rated members</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
