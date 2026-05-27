'use client';

import { useState, useTransition } from 'react';
import { createClubAsSuperAdminAction } from '@/lib/actions/superadmin';
import { PlayerSearchInput, type PlayerResult } from './PlayerSearchInput';

const TIERS = ['free', 'starter', 'pro', 'enterprise'] as const;
type Tier = typeof TIERS[number];

interface Props {
  onClose: () => void;
}

export function CreateClubForm({ onClose }: Props) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<Tier>('free');
  const [owner, setOwner] = useState<PlayerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Club name is required'); return; }
    setError(null);

    startTransition(async () => {
      const result = await createClubAsSuperAdminAction({
        name: name.trim(),
        subscriptionTier: tier,
        ownerId: owner?.id,
      });
      if ('error' in result) {
        setError(result.error ?? 'Failed to create club');
      } else {
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-surface-card ring-1 ring-brand-600/30 px-6 py-5 space-y-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-white">New Club</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Club name */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Club name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sydney Pickleball Club"
          required
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-brand-500"
        />
      </div>

      {/* Subscription tier */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Subscription tier
        </label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Owner search (optional) */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Club owner <span className="text-slate-600">(optional — assign an existing user)</span>
        </label>

        {owner ? (
          <div className="flex items-center gap-2 rounded-lg border border-brand-600/30 bg-brand-600/10 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {owner.full_name}
                <span className="ml-1.5 text-xs text-slate-400">@{owner.username}</span>
              </p>
              <p className="text-xs text-slate-400 truncate">{owner.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setOwner(null)}
              className="shrink-0 text-slate-500 hover:text-slate-300 text-xs transition-colors"
              aria-label="Remove owner"
            >
              ✕
            </button>
          </div>
        ) : (
          <PlayerSearchInput
            onSelect={setOwner}
            placeholder="Search for owner by name, @username or email…"
            disabled={isPending}
          />
        )}

        {!owner && (
          <p className="mt-1 text-xs text-slate-600">
            If left blank, you can assign a manager later via the Managers panel.
            To invite someone who doesn&apos;t have an account, use the &quot;Send invite link&quot; option in the Managers panel after creating the club.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Creating…' : 'Create club'}
        </button>
      </div>
    </form>
  );
}
