'use client';

import { useTransition } from 'react';
import { suspendClubAction } from '@/lib/actions/superadmin';
import { useConfirm } from '@/components/ui/ConfirmProvider';

interface Props {
  clubId: string;
  clubName: string;
  isSuspended: boolean;
}

export function SuspendClubButton({ clubId, clubName, isSuspended }: Props) {
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirm();

  async function handleClick() {
    const ok = await confirm(
      isSuspended
        ? {
            title: `Reactivate ${clubName}`,
            message: 'The club and its managers will regain full access to the platform.',
            confirmLabel: 'Reactivate',
            variant: 'default',
          }
        : {
            title: `Suspend ${clubName}`,
            message: 'Club managers will lose access immediately. Players can still view public pages.',
            confirmLabel: 'Suspend',
            variant: 'danger',
          },
    );
    if (!ok) return;

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
