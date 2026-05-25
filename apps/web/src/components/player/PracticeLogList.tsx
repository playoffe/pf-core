'use client';

import { useState, useTransition } from 'react';
import {
  createPracticeLogAction,
  updatePracticeLogAction,
  deletePracticeLogAction,
  type PracticeLogInput,
} from '@/lib/actions/practice';

type Log = {
  id: string;
  practice_date: string;
  duration_minutes: number | null;
  drill_types: string[];
  notes: string | null;
  partner_id: string | null;
  created_at: string;
};

const DRILL_OPTIONS = [
  'Dinking', 'Driving', 'Serving', 'Volleying',
  'Drops', 'Lobs', 'Court movement', 'Strategy', 'Footwork',
];

interface Props {
  logs: Log[];
}

export function PracticeLogList({ logs }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showForm && !editingId && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-surface-border py-4 text-sm font-semibold text-slate-500 hover:border-brand-500/50 hover:text-brand-400 transition-colors"
        >
          + Log a practice session
        </button>
      )}

      {/* New entry form */}
      {showForm && (
        <PracticeForm
          onSave={async (input) => {
            const res = await createPracticeLogAction(input);
            if (!res.error) setShowForm(false);
            return res;
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Log list */}
      {logs.length === 0 && !showForm && (
        <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
          <p className="text-2xl mb-2">🏓</p>
          <p className="text-sm text-slate-500">No practice sessions logged yet.</p>
          <p className="text-xs text-slate-600 mt-1">Track drills, duration, and notes to improve your game.</p>
        </div>
      )}

      {logs.map((log) =>
        editingId === log.id ? (
          <PracticeForm
            key={log.id}
            initial={log}
            onSave={async (input) => {
              const res = await updatePracticeLogAction(log.id, input);
              if (!res.error) setEditingId(null);
              return res;
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <LogCard
            key={log.id}
            log={log}
            onEdit={() => setEditingId(log.id)}
          />
        ),
      )}
    </div>
  );
}

// ── Log card ──────────────────────────────────────────────────────────────────
function LogCard({ log, onEdit }: { log: Log; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dateStr = new Date(log.practice_date + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="rounded-xl bg-surface-card px-5 py-4 ring-1 ring-surface-border">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{dateStr}</p>
            {log.duration_minutes && (
              <span className="rounded-full bg-brand-600/20 px-2 py-0.5 text-xs font-medium text-brand-300">
                {log.duration_minutes < 60
                  ? `${log.duration_minutes}min`
                  : `${(log.duration_minutes / 60).toFixed(1)}h`}
              </span>
            )}
          </div>

          {log.drill_types.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {log.drill_types.map((drill) => (
                <span key={drill} className="rounded-full border border-surface-border px-2 py-0.5 text-xs text-slate-400">
                  {drill}
                </span>
              ))}
            </div>
          )}

          {log.notes && (
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{log.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {confirmDelete ? (
            <>
              <button
                onClick={() => startTransition(async () => { await deletePracticeLogAction(log.id); })}
                disabled={isPending}
                className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {isPending ? '…' : 'Delete?'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 hover:text-slate-300">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={onEdit} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Practice form ─────────────────────────────────────────────────────────────
function PracticeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Log;
  onSave: (input: PracticeLogInput) => Promise<{ success?: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(initial?.practice_date ?? today);
  const [duration, setDuration] = useState(initial?.duration_minutes?.toString() ?? '');
  const [drills, setDrills] = useState<string[]>(initial?.drill_types ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function toggleDrill(drill: string) {
    setDrills((prev) =>
      prev.includes(drill) ? prev.filter((d) => d !== drill) : [...prev, drill],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await onSave({
        practice_date: date,
        duration_minutes: duration,
        drill_types: drills,
        notes,
        partner_id: null,
      });
      if (res.error) setError(res.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-surface-card px-5 py-5 ring-1 ring-brand-500/30 space-y-4"
    >
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-400">Date</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Duration (min)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="60"
            min={1}
            max={480}
            className={`${inputCls} w-28`}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">Drills practiced</p>
        <div className="flex flex-wrap gap-1.5">
          {DRILL_OPTIONS.map((drill) => (
            <button
              key={drill}
              type="button"
              onClick={() => toggleDrill(drill)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                drills.includes(drill)
                  ? 'bg-brand-600/30 border-brand-500/60 text-brand-300'
                  : 'border-surface-border text-slate-500 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              {drill}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Notes <span className="text-slate-600">{notes.length}/1000</span></label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
          rows={3}
          placeholder="What worked well? What to improve next time?"
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : initial ? 'Update' : 'Log session'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'block w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition';
