'use client';

import { useState } from 'react';
import { submitPlayerReportAction } from '@/lib/actions/player-reporting';

interface MatchInfo {
  id: string;
  status: string;
  entry_a: { id: string; name: string } | null;
  entry_b: { id: string; name: string } | null;
  category_name: string;
  tournament_name: string;
}

interface Props {
  match: MatchInfo;
}

interface SetScore {
  score_a: number;
  score_b: number;
}

export function PlayerReportForm({ match }: Props) {
  const [reporterEntryId, setReporterEntryId] = useState<string>('');
  const [winnerEntryId, setWinnerEntryId] = useState<string>('');
  const [sets, setSets] = useState<SetScore[]>([{ score_a: 0, score_b: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entryA = match.entry_a;
  const entryB = match.entry_b;

  function updateSet(idx: number, field: 'score_a' | 'score_b', value: number) {
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: Math.max(0, value) } : s)));
  }

  function addSet() {
    setSets((prev) => [...prev, { score_a: 0, score_b: 0 }]);
  }

  function removeSet(idx: number) {
    if (sets.length <= 1) return;
    setSets((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reporterEntryId || !winnerEntryId) {
      setError('Please select who you are and who won');
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await submitPlayerReportAction(
      match.id,
      reporterEntryId,
      winnerEntryId,
      sets,
    );

    if ('error' in res && res.error) {
      setError(res.error);
      setSubmitting(false);
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-surface-card ring-1 ring-surface-border p-8 text-center">
        <p className="text-3xl mb-3">🎾</p>
        <p className="text-lg font-semibold text-white mb-2">Score submitted!</p>
        <p className="text-sm text-slate-500">
          The tournament organiser will confirm the result shortly. Thank you!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
      {/* Match header */}
      <div className="px-6 py-5 border-b border-surface-border">
        <div className="flex items-center justify-between gap-4">
          <p className="text-base font-bold text-white truncate">{entryA?.name ?? 'TBD'}</p>
          <p className="shrink-0 text-xs text-slate-600 font-medium">vs</p>
          <p className="text-base font-bold text-white text-right truncate">{entryB?.name ?? 'TBD'}</p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Who are you */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wide">
            I am…
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[entryA, entryB].filter(Boolean).map((entry) => (
              <button
                key={entry!.id}
                type="button"
                onClick={() => setReporterEntryId(entry!.id)}
                className={`rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ring-1 ${
                  reporterEntryId === entry!.id
                    ? 'bg-brand-600/20 ring-brand-500 text-brand-200'
                    : 'bg-surface ring-surface-border text-slate-400 hover:ring-slate-500 hover:text-slate-300'
                }`}
              >
                {entry!.name}
              </button>
            ))}
          </div>
        </div>

        {/* Winner */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Winner
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[entryA, entryB].filter(Boolean).map((entry) => (
              <button
                key={entry!.id}
                type="button"
                onClick={() => setWinnerEntryId(entry!.id)}
                className={`rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ring-1 ${
                  winnerEntryId === entry!.id
                    ? 'bg-accent-500/20 ring-accent-400 text-accent-200'
                    : 'bg-surface ring-surface-border text-slate-400 hover:ring-slate-500 hover:text-slate-300'
                }`}
              >
                {winnerEntryId === entry!.id && <span className="mr-1.5">✓</span>}
                {entry!.name}
              </button>
            ))}
          </div>
        </div>

        {/* Set scores */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Set scores
            </label>
            <button
              type="button"
              onClick={addSet}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              + Add set
            </button>
          </div>

          <div className="space-y-2">
            {sets.map((set, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-10 shrink-0">Set {idx + 1}</span>

                {/* Score A */}
                <div className="flex-1">
                  <p className="text-[10px] text-slate-600 mb-1 truncate">{entryA?.name ?? 'A'}</p>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={set.score_a}
                    onChange={(e) => updateSet(idx, 'score_a', parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-center text-sm font-bold text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <span className="text-slate-600 font-bold shrink-0">–</span>

                {/* Score B */}
                <div className="flex-1">
                  <p className="text-[10px] text-slate-600 mb-1 truncate">{entryB?.name ?? 'B'}</p>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={set.score_b}
                    onChange={(e) => updateSet(idx, 'score_b', parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-center text-sm font-bold text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(idx)}
                    className="shrink-0 text-slate-600 hover:text-red-400 transition-colors text-sm"
                    title="Remove set"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !reporterEntryId || !winnerEntryId}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit score for review'}
        </button>

        <p className="text-center text-xs text-slate-600">
          The organiser will verify this result before it becomes official.
        </p>
      </div>
    </form>
  );
}
