'use client';

import { useState, useMemo } from 'react';

type Tournament = {
  id: string;
  name: string;
  slug: string;
  status: string;
  start_date: string;
  end_date: string;
  venue: string | null;
  clubs: { id: string; name: string } | null;
};

type Club = {
  id: string;
  name: string;
};

const STATUS_STYLE: Record<string, string> = {
  draft:             'bg-slate-700/40 text-slate-300',
  registration_open: 'bg-blue-500/20 text-blue-300',
  in_progress:       'bg-green-500/20 text-green-300',
  completed:         'bg-slate-500/20 text-slate-400',
  cancelled:         'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  draft:             'Draft',
  registration_open: 'Registration open',
  in_progress:       'In progress',
  completed:         'Completed',
  cancelled:         'Cancelled',
};

type StatusFilter = 'all' | 'draft' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';

interface Props {
  tournaments: Tournament[];
  clubs: Club[];
}

export function TournamentsListClient({ tournaments, clubs }: Props) {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState<StatusFilter>('all');
  const [clubId, setClubId]   = useState('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tournaments.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !(t.venue ?? '').toLowerCase().includes(q)) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (clubId !== 'all' && t.clubs?.id !== clubId) return false;
      return true;
    });
  }, [tournaments, search, status, clubId]);

  const hasFilters = search || status !== 'all' || clubId !== 'all';

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or venue…"
            className="w-full rounded-lg border border-surface-border bg-surface pl-8 pr-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="registration_open">Registration open</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Club filter */}
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-brand-500 max-w-48 truncate"
        >
          <option value="all">All clubs</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Result count + clear */}
        <p className="text-xs text-slate-500 whitespace-nowrap">
          {filtered.length} of {tournaments.length}
        </p>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatus('all'); setClubId('all'); }}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[t.status] ?? STATUS_STYLE.draft}`}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.clubs?.name ?? '—'} · {t.start_date} → {t.end_date}
                {t.venue ? ` · ${t.venue}` : ''}
              </p>
            </div>
            <a
              href={`/tournaments/${t.slug}`}
              className="shrink-0 ml-4 rounded-lg border border-surface-border px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
            >
              View →
            </a>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
            <p className="text-sm text-slate-500">
              {hasFilters ? 'No tournaments match your filters.' : 'No tournaments yet. Create one above.'}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setStatus('all'); setClubId('all'); }}
                className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
