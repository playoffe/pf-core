'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { createRefereePinAction, revokePinAction } from '@/lib/actions/referee';
import { useConfirm } from '@/components/ui/ConfirmProvider';

interface Pin {
  id: string;
  label: string | null;
  expires_at: string;
  is_revoked: boolean;
}

interface Props {
  tournamentId: string;
  pins: Pin[];
  initialSessions?: Array<{
    id: string;
    referee_name: string;
    last_active_at: string | null;
    matches_scored_count: number;
  }>;
}

export function RefereePinsPanel({ tournamentId, pins, initialSessions }: Props) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState(initialSessions ?? []);

  useEffect(() => {
    if (!tournamentId) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const channel = supabase
      .channel(`referee-sessions-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referee_sessions',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions((prev) => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSessions((prev) =>
              prev.map((s) => s.id === (payload.new as any).id ? (payload.new as any) : s),
            );
          } else if (payload.eventType === 'DELETE') {
            setSessions((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setNewPin(null);
    const result = await createRefereePinAction(tournamentId, label || 'Referee');
    if (result.error) {
      setError(result.error);
    } else {
      setNewPin(result.pin ?? null);
      setLabel('');
      router.refresh();
    }
    setCreating(false);
  }

  async function handleRevoke(pinId: string) {
    if (!await confirm({ title: 'Revoke PIN?', message: 'This PIN will stop working immediately. Any referee currently using it will lose access.', confirmLabel: 'Revoke', variant: 'danger' })) return;
    await revokePinAction(pinId);
    router.refresh();
  }

  const activePins = pins.filter((p) => !p.is_revoked && new Date(p.expires_at) > new Date());

  return (
    <section className="mt-8 rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
      <div className="border-b border-surface-border px-5 py-4">
        <h3 className="text-sm font-semibold text-white">Referee PINs</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Share a PIN with referees so they can score matches at{' '}
          <a href="/ref" target="_blank" className="text-brand-400 hover:underline">
            playoffe.com/ref
          </a>
        </p>
      </div>

      {/* New PIN display */}
      {newPin && (
        <div className="border-b border-surface-border bg-brand-900/30 px-5 py-4">
          <p className="text-xs font-semibold text-brand-300 mb-2">New PIN created — share this with the referee:</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-mono font-bold tracking-[0.3em] text-white">{newPin}</p>
            <button
              onClick={() => navigator.clipboard.writeText(newPin)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">This PIN will not be shown again. It expires in 7 days.</p>
          <button onClick={() => setNewPin(null)} className="mt-2 text-xs text-slate-600 hover:text-slate-400">
            Dismiss
          </button>
        </div>
      )}

      {/* Active PINs */}
      {activePins.length > 0 && (
        <div className="divide-y divide-surface-border">
          {activePins.map((pin) => (
            <div key={pin.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-white">{pin.label ?? 'Referee'}</p>
                <p className="text-xs text-slate-500">
                  Expires {new Date(pin.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(pin.id)}
                className="text-xs text-slate-600 hover:text-red-400 transition-colors"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {activePins.length === 0 && !newPin && (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-slate-500">No active PINs</p>
        </div>
      )}

      {/* Create new PIN */}
      <div className="border-t border-surface-border px-5 py-4 flex items-center gap-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Court 1 referee)"
          className="flex-1 rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {creating ? 'Generating…' : 'Generate PIN'}
        </button>
      </div>
      {error && <p className="px-5 pb-3 text-xs text-red-400">{error}</p>}

      {/* Active referee sessions */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Active referees
        </h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-600">No active referees.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl bg-surface-card px-4 py-3 ring-1 ring-surface-border"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{session.referee_name}</p>
                  {session.last_active_at && (
                    <p className="text-xs text-slate-500">
                      Last active {new Date(session.last_active_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {session.matches_scored_count ?? 0} match{(session.matches_scored_count ?? 0) !== 1 ? 'es' : ''} scored
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
