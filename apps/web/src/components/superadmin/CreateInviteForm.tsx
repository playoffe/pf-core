'use client';

import { useState, useTransition } from 'react';
import { createAdminInviteAction } from '@/lib/actions/superadmin';

const TIERS = [
  { value: 'free',       label: 'Free' },
  { value: 'starter',   label: 'Starter' },
  { value: 'pro',       label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

export function CreateInviteForm() {
  const [clubName, setClubName] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free');
  const [expiryDays, setExpiryDays] = useState(7);
  const [result, setResult] = useState<{ success?: true; inviteUrl?: string; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const res = await createAdminInviteAction({
        clubName: clubName.trim(),
        inviteeEmail: email.trim(),
        inviteeName: name.trim(),
        subscriptionTier: tier,
        expiryDays,
      });
      setResult(res);
      if (res.success) {
        setClubName('');
        setEmail('');
        setName('');
        setTier('free');
        setExpiryDays(7);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result?.error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
          {result.error}
        </div>
      )}

      {result?.success && result.inviteUrl && (
        <div className="rounded-lg border border-accent-800 bg-accent-950/30 px-4 py-3">
          <p className="text-xs font-semibold text-accent-400 mb-1.5">Invite created & email sent ✓</p>
          <p className="text-xs text-slate-400 mb-2">Share this link if needed:</p>
          <code className="block text-xs text-slate-300 bg-surface rounded px-2 py-1 break-all">{result.inviteUrl}</code>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Club name *</label>
          <input
            type="text"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            required
            placeholder="City Pickleball Club"
            className="block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Invitee name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Email address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jane@example.com"
            className="block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Subscription tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as typeof tier)}
              className="block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none transition focus:border-brand-500"
            >
              {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="w-28">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Expires in</label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              className="block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white outline-none transition focus:border-brand-500"
            >
              {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} day{d !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Sending invite…' : 'Send invite'}
      </button>
    </form>
  );
}
