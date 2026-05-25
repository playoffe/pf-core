'use client';

import { useTransition } from 'react';
import { revokeAdminInviteAction } from '@/lib/actions/superadmin';

interface Props {
  inviteId: string;
  clubName: string;
}

export function RevokeInviteButton({ inviteId, clubName }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Revoke the invite for "${clubName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await revokeAdminInviteAction(inviteId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
    >
      {isPending ? '…' : 'Revoke'}
    </button>
  );
}
