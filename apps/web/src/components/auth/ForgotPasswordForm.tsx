'use client';

import { useState } from 'react';
import { forgotPasswordAction } from '@/lib/actions/auth';

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await forgotPasswordAction(fd.get('email') as string);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">📬</div>
        <h2 className="text-lg font-semibold text-white">Check your email</h2>
        <p className="text-sm text-slate-400">
          If an account exists for that email, we&apos;ve sent a link to reset your password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">Email address</label>
        <input
          name="email"
          type="email"
          required
          placeholder="alex@example.com"
          className="block w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm text-white placeholder:text-slate-500 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send reset link'}
      </button>
    </form>
  );
}
