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

  // Summarise totals
  const totalSessions = logs.length;
  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);
  const thisMonthLogs = logs.filter((l) => l.practice_date.startsWith(new Date().toISOString().slice(0, 7)));

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
