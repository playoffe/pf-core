import type { Metadata } from 'next';
import Link from 'next/link';
import { getAuditLogAction } from '@/lib/actions/superadmin';

export const metadata: Metadata = { title: 'Audit Log · Super Admin' };

interface Props {
  searchParams: Promise<{ page?: string; action?: string; from?: string; to?: string }>;
}

const ACTION_LABELS: Record<string, string> = {
  admin_invite_created:    'Invite created',
  admin_invite_revoked:    'Invite revoked',
  admin_invite_claimed:    'Invite claimed',
  club_suspended:          'Club suspended',
  club_reactivated:        'Club reactivated',
  feature_flag_updated:    'Feature flag changed',
  permission_changed_global: 'Permission changed (global)',
  permission_changed_club:   'Permission changed (club)',
  permissions_reset_to_global: 'Permissions reset to global',
  score_submitted:         'Score submitted',
};

export default async function SuperAdminAuditPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));

  const { entries, total, pageSize } = await getAuditLogAction({
    page,
    actionType: sp.action || undefined,
    fromDate: sp.from || undefined,
    toDate: sp.to || undefined,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit log</h1>
          <p className="mt-1 text-sm text-slate-500">
            Immutable record of all Super Admin actions. {total.toLocaleString()} entries total.
          </p>
        </div>
        <a
          href="/api/superadmin/audit.csv"
          className="rounded-lg border border-surface-border px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-surface-card transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Entries list */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {ACTION_LABELS[entry.action_type] ?? entry.action_type.replace(/_/g, ' ')}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {entry.target_type && (
                    <span className="text-xs text-slate-500">
                      {entry.target_type}{entry.target_id ? ` · ${entry.target_id.slice(0, 8)}…` : ''}
                    </span>
                  )}
                  {entry.actor_id && (
                    <span className="text-xs text-slate-600">by {entry.actor_id.slice(0, 8)}…</span>
                  )}
                </div>
                {/* Show changed value if meaningful */}
                {entry.new_value && typeof entry.new_value === 'object' && (
                  <p className="text-xs text-slate-600 mt-1 font-mono">
                    {JSON.stringify(entry.new_value).slice(0, 120)}
                  </p>
                )}
              </div>
              <time className="text-xs text-slate-600 shrink-0">
                {new Date(entry.created_at).toLocaleString('en-AU', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </time>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
            <p className="text-sm text-slate-500">No audit log entries yet.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} ({total.toLocaleString()} entries)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/superadmin/audit?page=${page - 1}`}
                className="rounded-lg border border-surface-border px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-surface-card transition-colors"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/superadmin/audit?page=${page + 1}`}
                className="rounded-lg border border-surface-border px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-surface-card transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
