'use client';

import { useTransition } from 'react';
import { suspendClubAction } from '@/lib/actions/superadmin';

interface Props {
  clubId: string;
  clubName: string;
  isSuspended: boolean;
}

export function SuspendClubButton({ clubId, clubName, isSuspended }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const action = isSuspended ? 'reactivate' : 'suspend';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${clubName}"?${
        !isSuspended ? ' This will prevent the club from being accessed by its managers.' : ''
      }`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      await suspendClubAction(clubId, !isSuspended);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
        isSuspended
          ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
      }`}
    >
      {isPending ? '…' : isSuspended ? 'Reactivate' : 'Suspend'}
    </button>
  );
}
