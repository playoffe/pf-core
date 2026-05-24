import { NavSkeleton } from '@/components/layout/NavSkeleton';

export default function DrawLoading() {
  return (
    <div className="min-h-screen bg-surface animate-pulse">
      <NavSkeleton />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-3 w-20 rounded bg-slate-800" />
          <div className="h-3 w-2 rounded bg-slate-800" />
          <div className="h-3 w-32 rounded bg-slate-800" />
          <div className="h-3 w-2 rounded bg-slate-800" />
          <div className="h-3 w-28 rounded bg-slate-800" />
        </div>

        {/* Title */}
        <div className="mb-2 h-7 w-48 rounded bg-slate-700" />
        <div className="mb-8 h-4 w-36 rounded bg-slate-800" />

        {/* Standings skeleton */}
        <div className="mb-8">
          <div className="mb-3 h-3 w-28 rounded bg-slate-800" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
                <div className="border-b border-surface-border px-4 py-2">
                  <div className="h-3 w-16 rounded bg-slate-700" />
                </div>
                <div className="divide-y divide-surface-border">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="h-3 w-4 rounded bg-slate-800" />
                      <div className="h-3 flex-1 rounded bg-slate-700" />
                      <div className="h-3 w-6 rounded bg-slate-800" />
                      <div className="h-3 w-6 rounded bg-slate-800" />
                      <div className="h-3 w-6 rounded bg-slate-800" />
                      <div className="h-3 w-10 rounded bg-slate-800" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bracket label */}
        <div className="mb-4 h-3 w-16 rounded bg-slate-800" />

        {/* Bracket cards */}
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-14 flex-1 rounded-xl bg-surface-card ring-1 ring-surface-border" />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
