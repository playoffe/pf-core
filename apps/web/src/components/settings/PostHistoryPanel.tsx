'use client';

import type { PostLogRow } from '@/lib/actions/social';
import { formatDistanceToNow } from 'date-fns';

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook:  'Facebook',
  x:         'X',
  whatsapp:  'WhatsApp',
};

const TRIGGER_LABELS: Record<string, string> = {
  match_win:            'Match win',
  category_complete:    'Category complete',
  tournament_complete:  'Tournament complete',
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  posted:           { label: 'Posted',          className: 'text-accent-400 bg-accent-500/10' },
  pending_preview:  { label: 'Awaiting review', className: 'text-amber-300 bg-amber-900/30' },
  posting:          { label: 'Posting…',        className: 'text-brand-300 bg-brand-900/30 animate-pulse' },
  failed:           { label: 'Failed',          className: 'text-red-400 bg-red-900/20' },
  preview_declined: { label: 'Declined',        className: 'text-slate-400 bg-slate-800/50' },
  skipped:          { label: 'Skipped',         className: 'text-slate-500 bg-slate-800/40' },
  queued:           { label: 'Queued',          className: 'text-slate-400 bg-slate-800/40' },
  generating:       { label: 'Generating',      className: 'text-brand-300 bg-brand-900/30 animate-pulse' },
};

interface Props {
  history: PostLogRow[];
}

export function PostHistoryPanel({ history }: Props) {
  if (history.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Post history
        </h2>
        <div className="rounded-xl bg-surface-card p-8 text-center ring-1 ring-surface-border">
          <p className="text-sm text-slate-500">No posts yet. Enable social media auto-posting below to get started.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Post history
      </h2>

      <div className="rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Platform</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 hidden sm:table-cell">Trigger</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 hidden md:table-cell">Caption</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {history.map((row) => {
              const statusStyle = STATUS_STYLES[row.status] ?? { label: row.status, className: 'text-slate-400' };
              const displayTime = row.posted_at ?? row.queued_at;
              const timeAgo = formatDistanceToNow(new Date(displayTime), { addSuffix: true });

              return (
                <tr key={row.id} className="hover:bg-surface/20 transition-colors">
                  {/* Platform */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-white text-sm">
                      {PLATFORM_LABELS[row.platform] ?? row.platform}
                    </span>
                  </td>

                  {/* Trigger */}
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                    {TRIGGER_LABELS[row.trigger_type] ?? row.trigger_type}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle.className}`}>
                      {statusStyle.label}
                    </span>
                    {/* WhatsApp: share link button */}
                    {row.platform === 'whatsapp' && row.status === 'posted' && row.platform_post_id && (
                      <a
                        href={row.platform_post_id}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-[11px] text-green-400 hover:text-green-300 underline transition-colors"
                      >
                        Share →
                      </a>
                    )}
                    {/* Error tooltip for failed posts */}
                    {row.status === 'failed' && row.error_message && (
                      <p className="mt-0.5 text-[10px] text-red-500 truncate max-w-[160px]" title={row.error_message}>
                        {row.error_message}
                      </p>
                    )}
                  </td>

                  {/* Caption snippet */}
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-[200px]">
                    <span className="line-clamp-1">{row.caption ?? '—'}</span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-4 py-3 text-right text-xs text-slate-500">
                    {timeAgo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
