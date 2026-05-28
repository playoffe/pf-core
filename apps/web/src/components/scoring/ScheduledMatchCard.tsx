'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { startMatchAction } from '@/lib/actions/scoring';

interface ActiveReferee {
  id: string;
  referee_name: string;
}

interface MatchEntry {
  id: string;
  seed: number | null;
  players: { full_name: string } | null;
  partner: { full_name: string } | null;
}

interface Props {
  matchId: string;
  tournamentSlug: string;
  categoryName: string;
  roundLabel: string;
  groupName: string | null;
  scheduledTime: string | null;
  court: number | null;
  assignedRefereeName: string | null;
  maxCourts: number;
  entryA: MatchEntry | null;
  entryB: MatchEntry | null;
  playFormat: string;
  activeReferees: ActiveReferee[];
}

function teamName(entry: MatchEntry | null, playFormat: string): string {
  if (!entry?.players) return 'TBD';
  const isDoubles = playFormat === 'doubles' || playFormat === 'mixed_doubles';
  if (isDoubles && entry.partner) return `${entry.players.full_name} / ${entry.partner.full_name}`;
  return entry.players.full_name;
}

export function ScheduledMatchCard({
  matchId,
  tournamentSlug,
  categoryName,
  roundLabel,
  groupName,
  scheduledTime,
  court,
  assignedRefereeName,
  maxCourts,
  entryA,
  entryB,
  playFormat,
  activeReferees,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [courtVal, setCourtVal] = useState<string>(court ? String(court) : '');
  const [referee, setReferee] = useState<string>(assignedRefereeName ?? '');
  const [error, setError] = useState<string | null>(null);

  const aName = teamName(entryA, playFormat);
  const bName = teamName(entryB, playFormat);

  function handleStart() {
    const courtNum = parseInt(courtVal, 10);
    if (!courtVal || isNaN(courtNum) || courtNum < 1) {
      setError('Please assign a court number before starting.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await startMatchAction(matchId, courtNum, referee || undefined);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
        router.push(`/tournaments/${tournamentSlug}/scoring/${matchId}`);
      }
    });
  }

  const courtOptions = Array.from({ length: maxCourts }, (_, i) => i + 1);

  return (
    <div className="rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
      {/* Match header — clickable link to detail */}
      <Link
        href={`/tournaments/${tournamentSlug}/scoring/${matchId}`}
        className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
      >
        <div className="w-14 shrink-0 text-center space-y-1 pt-0.5">
          {scheduledTime && (
            <p className="text-xs font-mono text-slate-400">
              {new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {aName}
            <span className="mx-2 text-slate-500 font-normal">vs</span>
            {bName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {categoryName}
            {roundLabel ? ` · ${roundLabel}` : ''}
            {groupName ? ` · ${groupName}` : ''}
          </p>
        </div>

        <span className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 text-sm">›</span>
      </Link>

      {/* Assignment controls */}
      <div className="border-t border-surface-border px-5 py-3 flex flex-wrap items-center gap-3">
        {/* Court picker */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 shrink-0">Court</label>
          <select
            value={courtVal}
            onChange={(e) => { setCourtVal(e.target.value); setError(null); }}
            className="rounded-lg border border-slate-700 bg-surface px-2.5 py-1.5 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
          >
            <option value="">— select —</option>
            {courtOptions.map((c) => (
              <option key={c} value={c}>Court {c}</option>
            ))}
          </select>
        </div>

        {/* Referee picker */}
        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <label className="text-xs text-slate-500 shrink-0">Referee</label>
          {activeReferees.length > 0 ? (
            <select
              value={referee}
              onChange={(e) => setReferee(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-surface px-2.5 py-1.5 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
            >
              <option value="">— none —</option>
              {activeReferees.map((r) => (
                <option key={r.id} value={r.referee_name}>{r.referee_name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={referee}
              onChange={(e) => setReferee(e.target.value)}
              placeholder="Name (optional)"
              className="flex-1 rounded-lg border border-slate-700 bg-surface px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none"
            />
          )}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={isPending}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-accent-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-600 transition-colors disabled:opacity-50"
        >
          <span className="text-[10px]">▶</span>
          {isPending ? 'Starting…' : 'Start match'}
        </button>
      </div>

      {/* Assigned badge (when court/referee already set but not started) */}
      {(court || assignedRefereeName) && (
        <div className="border-t border-surface-border px-5 py-2 flex items-center gap-3">
          {court && (
            <span className="text-[11px] text-slate-500">
              <span className="text-slate-400 font-medium">Ct {court}</span> assigned
            </span>
          )}
          {assignedRefereeName && (
            <span className="text-[11px] text-slate-500">
              Referee: <span className="text-slate-400 font-medium">{assignedRefereeName}</span>
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="px-5 pb-3 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
