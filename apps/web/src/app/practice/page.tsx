import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';
import { PracticeLogList } from '@/components/player/PracticeLogList';
import { getPracticeLogsAction } from '@/lib/actions/practice';

export const metadata: Metadata = { title: 'Practice Log · PLAYOFFE' };

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const logs = await getPracticeLogsAction();

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalSessions = logs.length;
  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);
  const thisMonthLogs = logs.filter((l) => l.practice_date.startsWith(new Date().toISOString().slice(0, 7)));

  // ── Drill frequency (top 5) ───────────────────────────────────────────────
  const drillFreq = new Map<string, number>();
  for (const log of logs) {
    for (const drill of (log.drill_types as string[] | null) ?? []) {
      if (drill) drillFreq.set(drill, (drillFreq.get(drill) ?? 0) + 1);
    }
  }
  const totalDrillOccurrences = [...drillFreq.values()].reduce((a, b) => a + b, 0) || 1;
  const topDrills = [...drillFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ── Weekly streak (consecutive weeks with ≥1 session) ────────────────────
  function getISOWeek(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = (d.getDay() + 6) % 7; // Mon = 0
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);
    return monday.toISOString().slice(0, 10);
  }

  const weeksWithSessions = new Set(logs.map((l) => getISOWeek(l.practice_date)));
  let streak = 0;
  if (weeksWithSessions.size > 0) {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - dayOfWeek);

    let checkDate = new Date(thisMonday);
    while (true) {
      const key = checkDate.toISOString().slice(0, 10);
      if (weeksWithSessions.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 7);
      } else {
        // Allow current week to not have a session yet (it may not have started)
        if (streak === 0 && key === thisMonday.toISOString().slice(0, 10)) {
          // Current week — check previous week before giving up
          checkDate.setDate(checkDate.getDate() - 7);
          continue;
        }
        break;
      }
    }
  }

  // ── Monthly trend (last 6 months) ────────────────────────────────────────
  const monthBuckets: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthBuckets[key] = 0;
  }
  for (const log of logs) {
    const key = log.practice_date.slice(0, 7);
    if (key in monthBuckets) monthBuckets[key]++;
  }
  const monthEntries = Object.entries(monthBuckets);
  const maxMonthCount = Math.max(...monthEntries.map(([, v]) => v), 1);

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-AU', { month: 'short' });
  };

  const hasInsights = totalSessions > 0;

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Practice Log</h1>
            <p className="mt-0.5 text-sm text-slate-500">Private · only you can see this</p>
          </div>
        </div>

        {/* Summary chips */}
        {totalSessions > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            <Chip label="Total sessions" value={totalSessions.toString()} />
            <Chip label="Total hours" value={`${(totalMinutes / 60).toFixed(1)}h`} />
            <Chip label="This month" value={thisMonthLogs.length.toString()} />
          </div>
        )}

        {/* Insights section */}
        {hasInsights && (
          <div className="mb-8 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Insights</h2>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Drill frequency */}
              <div className="rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4 sm:col-span-2">
                <p className="mb-3 text-xs font-semibold text-slate-400">Top drills</p>
                {topDrills.length === 0 ? (
                  <p className="text-xs text-slate-600">No drill data yet. Add drills to your logs.</p>
                ) : (
                  <div className="space-y-2">
                    {topDrills.map(([drill, count]) => {
                      const pct = Math.round((count / totalDrillOccurrences) * 100);
                      const barPct = Math.round((count / topDrills[0][1]) * 100);
                      return (
                        <div key={drill}>
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className="text-xs text-slate-300 capitalize">{drill}</span>
                            <span className="text-[10px] text-slate-500 tabular-nums">
                              {count} session{count !== 1 ? 's' : ''} · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface">
                            <div
                              className="h-1.5 rounded-full bg-brand-600"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Weekly streak */}
              <div className="rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-white">{streak}</p>
                <p className="text-xs text-slate-500 mt-1">
                  week{streak !== 1 ? 's' : ''} streak
                </p>
                {streak === 0 ? (
                  <p className="mt-2 text-[10px] text-slate-600">Practice this week to start a streak!</p>
                ) : (
                  <p className="mt-2 text-[10px] text-accent-400">🔥 Keep it up!</p>
                )}
              </div>
            </div>

            {/* Monthly trend */}
            <div className="rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4">
              <p className="mb-3 text-xs font-semibold text-slate-400">Sessions per month</p>
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
        )}

        <PracticeLogList logs={logs} />
      </main>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-card px-4 py-3 ring-1 ring-surface-border text-center min-w-[80px]">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
