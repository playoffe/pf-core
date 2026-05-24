'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfileAction } from '@/lib/actions/profile';

interface Props {
  initial: {
    full_name: string;
    location: string | null;
    photo_url: string | null;
    headline: string | null;
    bio: string | null;
    playing_since: number | null;
  };
  username: string;
}

export function EditProfileForm({ initial, username }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [values, setValues] = useState({
    full_name: initial.full_name,
    location: initial.location ?? '',
    headline: initial.headline ?? '',
    bio: initial.bio ?? '',
    playing_since: initial.playing_since?.toString() ?? '',
  });

  function set(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateProfileAction(values);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      // Brief pause, then navigate to updated profile
      setTimeout(() => router.push(`/p/${username}`), 800);
    }
    setSaving(false);
  }

  const bioLen = values.bio.length;
  const headlineLen = values.headline.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Display name */}
      <Field label="Display name" required>
        <input
          type="text"
          value={values.full_name}
          onChange={(e) => set('full_name', e.target.value)}
          placeholder="Your full name"
          maxLength={100}
          required
          className={inputCls}
        />
      </Field>

      {/* Location */}
      <Field label="Location" hint="City or region — shown on your profile and rankings">
        <input
          type="text"
          value={values.location}
          onChange={(e) => set('location', e.target.value)}
          placeholder="e.g. Sydney, NSW"
          maxLength={80}
          className={inputCls}
        />
      </Field>

      {/* Headline */}
      <Field
        label="Headline"
        hint={`${headlineLen}/120`}
      >
        <input
          type="text"
          value={values.headline}
          onChange={(e) => set('headline', e.target.value.slice(0, 120))}
          placeholder="e.g. Open singles finalist · 4.5 rated"
          maxLength={120}
          className={inputCls}
        />
      </Field>

      {/* Bio */}
      <Field
        label="Bio"
        hint={`${bioLen}/600`}
      >
        <textarea
          value={values.bio}
          onChange={(e) => set('bio', e.target.value.slice(0, 600))}
          placeholder="Tell other players a bit about yourself…"
          rows={4}
          maxLength={600}
          className={`${inputCls} resize-none`}
        />
      </Field>

      {/* Playing since */}
      <Field label="Playing since" hint="Year you started playing pickleball">
        <input
          type="number"
          value={values.playing_since}
          onChange={(e) => set('playing_since', e.target.value)}
          placeholder="e.g. 2021"
          min={1990}
          max={new Date().getFullYear()}
          className={`${inputCls} w-32`}
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm text-accent-400">
          Profile saved! Redirecting…
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/p/${username}`)}
          className="rounded-lg border border-surface-border px-5 py-2.5 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'block w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition';

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-medium text-slate-300">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
        {hint && <span className="text-xs text-slate-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
