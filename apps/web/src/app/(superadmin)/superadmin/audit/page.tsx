import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { getAuditLogAction } from '@/lib/actions/superadmin';
import { AuditFilters } from '@/components/superadmin/AuditFilters';

export const metadata: Metadata = { title: 'Audit Log · Super Admin' };

interface Props {
  searchParams: Promise<{ page?: string; action?: string; from?: string; to?: string }>;
}

const ACTION_LABELS: Record<string, string> = {
  admin_invite_created:        'Invite created',
  admin_invite_revoked:        'Invite revoked',
  admin_invite_claimed:        'Invite claimed',
  club_suspended:              'Club suspended',
  club_reactivated:            'Club reactivated',
  feature_flag_updated:        'Feature flag changed',
  permission_changed_global:   'Permission changed (global)',
  permission_changed_club:     'Permission changed (club)',
  permissions_reset_to_global: 'Permissions reset to global',
  score_submitted:             'Score submitted',
};

// ── Diff pills ────────────────────────────────────────────────────────────────

const NOISE_KEYS = new Set(['updated_at', 'updated_by', 'created_at', 'id']);
const MAX_PILLS = 4;

function DiffView({ oldVal, newVal }: { oldVal: unknown; newVal: unknown }) {
  if (!newVal || typeof newVal !== 'object') return null;

  const newObj = newVal as Record<string, unknown>;
  const oldObj =
    oldVal && typeof oldVal === 'object' ? (oldVal as Record<string, unknown>) : {};

  const pills: ReactNode[] = [];
  const allKeys = Object.keys(newObj).filter((k) => !NOISE_KEYS.has(k));

  for (const key of allKeys) {
    if (pills.length >= MAX_PILLS) break;
    const val = newObj[key];
    const oldValue = oldObj[key];
    const changed = oldValue !== undefined && oldValue !== val;

    if (typeof val === 'boolean') {
      if (changed) {
        pills.push(
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-mono"
          >
            <span className="text-slate-400">{key}:</span>
            <span className={oldValue ? 'text-green-400' : 'text-red-400'}>
              {String(oldValue)}
            </span>
            <span className="text-slate-600">→</span>
            <span className={val ? 'text-green-400' : 'text-red-400'}>{String(val)}</span>
          </span>,
        );
      } else {
        pills.push(
          <span
            key={key}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono ${
              val ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            }`}
          >
            <span className="text-slate-500 mr-0.5">{key}:</span>
            {String(val)}
          </span>,
        );
      }
    } else if (typeof val === 'string' || typeof val === 'number') {
      const displayVal = String(val).length > 24 ? `${String(val).slice(0, 22)}…` : String(val);
      if (changed) {
        const displayOld =
          String(oldValue).length > 24 ? `${String(oldValue).slice(0, 22)}…` : String(oldValue);
        pills.push(
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-mono"
          >
            <span className="text-slate-400">{key}:</span>
            <span className="text-slate-500 line-through">{displayOld}</span>
            <span className="text-slate-600">→</span>
            <span className="text-slate-300">{displayVal}</span>
          </span>,
        );
      } else {
        pills.push(
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-mono text-slate-400"
          >
            <span className="text-slate-500 mr-0.5">{key}:</span>
            {displayVal}
          </span>,
        );
      }
    }
    // Skip object/array values — too complex to summarise as pills
  }

  if (pills.length === 0) return null;

  const remaining = allKeys.length - MAX_PILLS;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {pills}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-600">
          +{remaining} more
        </span>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

      {/* Filters */}
      <Suspense fallback={null}>
        <AuditFilters
          currentAction={sp.action ?? ''}
          currentFrom={sp.from ?? ''}
          currentTo={sp.to ?? ''}
        />
      </Suspense>

      {/* Entries list */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {ACTION_LABELS[entry.action_type] ?? entry.action_type.replace(/_/g, ' ')}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {entry.target_type && (
                    <span className="text-xs text-slate-500">
                      {entry.target_type === 'feature_flag'
                        ? ((entry.new_value as Record<string, unknown>)
                            ?.feature_module as string) ??
                          entry.target_id?.slice(0, 8) ??
                          ''
                        : `${entry.target_type}${entry.target_id ? ` · ${entry.target_id.slice(0, 8)}…` : ''}`}
                    </span>
                  )}
                  {entry.actor_id && (
                    <span className="text-xs text-slate-600">
                      by {entry.actor_name ?? `${entry.actor_id.slice(0, 8)}…`}
                    </span>
                  )}
                </div>
                {/* Diff pills */}
                <DiffView oldVal={entry.old_value} newVal={entry.new_value} />
              </div>
              <time className="text-xs text-slate-600 shrink-0">
                {new Date(entry.created_at).toLocaleString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
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
                href={`/superadmin/audit?page=${page - 1}${sp.action ? `&action=${sp.action}` : ''}${sp.from ? `&from=${sp.from}` : ''}${sp.to ? `&to=${sp.to}` : ''}`}
                className="rounded-lg border border-surface-border px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-surface-card transition-colors"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/superadmin/audit?page=${page + 1}${sp.action ? `&action=${sp.action}` : ''}${sp.from ? `&from=${sp.from}` : ''}${sp.to ? `&to=${sp.to}` : ''}`}
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
