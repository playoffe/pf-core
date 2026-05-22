export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-surface animate-pulse">
      <div className="border-b border-surface-border bg-surface-card px-6 py-3.5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <div className="h-5 w-28 rounded bg-slate-700" />
          <div className="hidden gap-5 sm:flex">
            <div className="h-4 w-14 rounded bg-slate-700" />
            <div className="h-4 w-20 rounded bg-slate-700" />
            <div className="h-4 w-28 rounded bg-slate-700" />
          </div>
          <div className="h-7 w-24 rounded bg-slate-700" />
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <div className="h-7 w-48 rounded bg-slate-700" />
          <div className="mt-2 h-4 w-64 rounded bg-slate-800" />
        </div>
        <div className="mb-3 h-4 w-32 rounded bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col rounded-2xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
              <div className="h-1.5 w-full bg-slate-700" />
              <div className="p-6 space-y-3">
                <div className="h-3 w-20 rounded bg-slate-800" />
                <div className="h-5 w-full rounded bg-slate-700" />
                <div className="h-4 w-32 rounded bg-slate-800" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded bg-slate-800" />
                  <div className="h-5 w-20 rounded bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
