'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

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

interface Props {
  currentAction: string;
  currentFrom: string;
  currentTo: string;
}

export function AuditFilters({ currentAction, currentFrom, currentTo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page'); // reset to page 1 on filter change
      router.push(`/superadmin/audit?${params.toString()}`);
    },
    [router, searchParams],
  );

  const hasFilters = !!(currentAction || currentFrom || currentTo);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Action type */}
      <select
        value={currentAction}
        onChange={(e) => updateFilter('action', e.target.value)}
        className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0"
      >
        <option value="">All actions</option>
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      {/* From date */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">From</label>
        <input
          type="date"
          value={currentFrom}
          onChange={(e) => updateFilter('from', e.target.value)}
          className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0"
        />
      </div>

      {/* To date */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">To</label>
        <input
          type="date"
          value={currentTo}
          onChange={(e) => updateFilter('to', e.target.value)}
          className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0"
        />
      </div>

      {/* Clear all — only when a filter is active */}
      {hasFilters && (
        <button
          onClick={() => router.push('/superadmin/audit')}
          className="rounded-lg border border-surface-border px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
