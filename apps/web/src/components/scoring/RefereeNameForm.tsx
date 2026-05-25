'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startRefereeSessionAction } from '@/lib/actions/referee';

interface Props {
  pin: string;
}

export function RefereeNameForm({ pin }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await startRefereeSessionAction(pin, name.trim());
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface-card p-8 ring-1 ring-surface-border">
        <h1 className="text-xl font-bold text-white mb-1">Enter your name</h1>
        <p className="text-sm text-slate-500 mb-6">
          Required before you can score matches as a guest referee.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              required
              className="w-full rounded-lg bg-surface px-4 py-2.5 text-sm text-white placeholder-slate-600 ring-1 ring-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Starting session…' : 'Start scoring'}
          </button>
        </form>
      </div>
    </div>
  );
}
