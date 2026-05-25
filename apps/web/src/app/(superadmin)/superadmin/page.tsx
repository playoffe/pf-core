import type { Metadata } from 'next';
import { getPlatformStatsAction, getAuditLogAction } from '@/lib/actions/superadmin';

export const metadata: Metadata = { title: 'Super Admin · PLAYOFFE' };

export default async function SuperAdminOverviewPage() {
  const [stats, auditData] = await Promise.all([
    getPlatformStatsAction(),
    getAuditLogAction({ page: 1 }),
  ]);

  const statCards = [
    { label: 'Total clubs',        value: stats.totalClubs,        icon: '🏟️' },
    { label: 'Total players',       value: stats.totalPlayers,       icon: '🎾' },
    { label: 'Active tournaments',  value: stats.activeTournaments,  icon: '🏆' },
    { label: 'Total matches',       value: stats.totalMatches,       icon: '📊' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform overview</h1>
        <p className="mt-1 text-sm text-slate-500">Real-time stats across all clubs and tournaments.</p>
      </div>

      {/* Stats grid */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl bg-surface-card p-5 ring-1 ring-surface-border">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-bold text-white">{s.value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent audit activity */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Recent activity
        </h2>
        <div className="space-y-2">
          {auditData.entries.slice(0, 10).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-xl bg-surface-card px-5 py-3 ring-1 ring-surface-border"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {entry.action_type.replace(/_/g, ' ')}
                </p>
                {entry.target_type && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {entry.target_type}{entry.target_id ? ` · ${entry.target_id.slice(0, 8)}…` : ''}
                  </p>
                )}
              </div>
              <time className="text-xs text-slate-600 shrink-0 ml-4">
                {new Date(entry.created_at).toLocaleString('en-AU', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </time>
            </div>
          ))}

          {auditData.entries.length === 0 && (
            <div className="rounded-xl bg-surface-card p-8 text-center ring-1 ring-surface-border">
              <p className="text-sm text-slate-500">No activity yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
