import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';
import { ClubAdminNav } from '@/components/clubs/ClubAdminNav';
import { getClubAnalyticsAction } from '@/lib/actions/clubs';

export const metadata: Metadata = { title: 'Club Analytics' };

interface Props {
  params: Promise<{ slug: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  registration_open: 'Registration open',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default async function ClubAnalyticsPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?return=/clubs/${slug}/analytics`);

  const admin = createAdminClient();

  const { data: club } = await admin
    .from('clubs')
    .select('*, club_managers!inner(role, player_id)')
    .eq('slug', slug)
    .eq('club_managers.player_id', user.id)
    .single();

  if (!club) notFound();

  const role = (club.club_managers as { role: string }[])[0]?.role ?? 'manager';
  const isOwner = role === 'owner';

  const analytics = await getClubAnalyticsAction(club.id);

  // Monthly tournament activity (last 6 months)
  const now = new Date();
  const monthBuckets: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthBuckets[key] = 0;
  }
  for (const t of analytics.recentTournaments) {
    const key = t.start_date.slice(0, 7);
    if (key in monthBuckets) monthBuckets[key]++;
  }
  const monthEntries = Object.entries(monthBuckets);
  const maxMonthCount = Math.max(...monthEntries.map(([, v]) => v), 1);
  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-AU', { month: 'short' });
  };

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Club header */}
        <div className="mb-8 flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black text-white shadow"
            style={{ backgroundColor: club.brand_primary_color }}
          >
            {club.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {[club.city, club.location].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <ClubAdminNav clubSlug={slug} activeTab="analytics" isOwner={isOwner} />

        {/* Summary row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total members', value: analytics.totalMembers.toString() },
            { label: 'Tournaments run', value: analytics.totalTournaments.toString() },
            { label: 'Active tournaments', value: analytics.activeTournaments.toString() },
            { label: 'Avg member rating', value: analytics.avgRating > 0 ? analytics.avgRating.toFixed(2) : '—' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-card p-5 ring-1 ring-surface-border">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top performers */}
          <div className="rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4">
            <p className="mb-4 text-sm font-semibold text-white">Top performers</p>
            {analytics.topMembers.length === 0 ? (
              <p className="text-xs text-slate-500">No member data yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.topMembers.map((member, i) => (
                  <div key={member.player_id} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-slate-600 tabular-nums">
                      {i + 1}
                    </span>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-brand-300">
                      {member.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/p/${member.username}`}
                        className="text-sm font-medium text-white hover:text-brand-300 transition-colors"
                      >
                        {member.full_name}
                      </Link>
                      <p className="text-[10px] text-slate-500">
                        {member.wins}W – {member.losses}L
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-semibold text-brand-300">
                      {member.current_rating.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly activity */}
          <div className="rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4">
            <p className="mb-4 text-sm font-semibold text-white">Monthly tournament activity</p>
            <div className="flex items-end gap-2 h-16">
              {monthEntries.map(([key, count]) => {
                const heightPct = (count / maxMonthCount) * 100;
                return (
                  <div key={key} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500 tabular-nums">{count || ''}</span>
                    <div className="w-full flex items-end" style={{ height: 40 }}>
                      <div
                        className="w-full rounded-sm bg-brand-600/70 transition-all"
                        style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-600">{formatMonth(key)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tournament history */}
        {analytics.recentTournaments.length > 0 && (
          <div className="mt-6 rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border">
              <p className="text-sm font-semibold text-white">Tournament history</p>
            </div>
            <div className="divide-y divide-surface-border">
              {analytics.recentTournaments.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(t.start_date).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
