'use client';

import { useState } from 'react';
import { resetPasswordAction } from '@/lib/actions/auth';

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const password = fd.get('password') as string;
    const confirm = fd.get('confirm') as string;
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    const result = await resetPasswordAction(password);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="text-lg font-semibold text-white">Password updated</h2>
        <p className="text-sm text-slate-400">You can now log in with your new password.</p>
        <a
          href="/login"
          className="inline-block w-full rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Go to login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">New password</label>
        <input
          name="password"
          type="password"
          required
          placeholder="Min. 8 characters"
          className="block w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm text-white placeholder:text-slate-500 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">Confirm new password</label>
        <input
          name="confirm"
          type="password"
          required
          placeholder="Re-enter password"
          className="block w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm text-white placeholder:text-slate-500 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
}
