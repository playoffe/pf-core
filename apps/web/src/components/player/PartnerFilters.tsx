'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export function PartnerFilters({
  currentGender,
  currentLocation,
  currentFormat,
}: {
  currentGender: string;
  currentLocation: string;
  currentFormat: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const hasFilters = currentGender || currentLocation || currentFormat;

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className={`mb-6 rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-end gap-3">
        {/* Gender */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs font-medium text-slate-500">Gender</label>
          <select
            value={currentGender}
            onChange={(e) => update('gender', e.target.value)}
            className="rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500 transition"
          >
            <option value="">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-slate-500">Location</label>
          <input
            type="text"
            value={currentLocation}
            onChange={(e) => update('location', e.target.value)}
            placeholder="e.g. Sydney"
            className="rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-brand-500 transition"
          />
        </div>

        {/* Format preference */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-medium text-slate-500">Format experience</label>
          <select
            value={currentFormat}
            onChange={(e) => update('format', e.target.value)}
            className="rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500 transition"
          >
            <option value="">Any</option>
            <option value="doubles">Doubles player</option>
            <option value="singles">Singles player</option>
          </select>
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mb-0.5 text-xs text-slate-500 hover:text-slate-300 transition-colors self-end pb-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
