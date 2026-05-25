'use client';

import { useTransition, useState } from 'react';
import { activatePlayerProfileAction } from '@/lib/actions/superadmin';

export function ActivatePlayerButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  function handleActivate() {
    startTransition(async () => {
      const res = await activatePlayerProfileAction();
      setResult(res);
    });
  }

  if (result?.success) {
    return (
      <p className="text-sm text-accent-400 font-semibold">
        ✓ Player profile activated — you can now switch roles in the nav bar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {result?.error && (
        <p className="text-sm text-red-400">{result.error}</p>
      )}
      <button
        onClick={handleActivate}
        disabled={isPending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Activating…' : 'Activate player profile'}
      </button>
    </div>
  );
}
