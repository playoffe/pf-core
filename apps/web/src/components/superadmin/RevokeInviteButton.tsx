'use client';

import { useTransition } from 'react';
import { revokeAdminInviteAction } from '@/lib/actions/superadmin';
import { useConfirm } from '@/components/ui/ConfirmProvider';

interface Props {
  inviteId: string;
  clubName: string;
}

export function RevokeInviteButton({ inviteId, clubName }: Props) {
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirm();

  async function handleClick() {
    const ok = await confirm({
      title: 'Revoke invite',
      message: `The pending invite for "${clubName}" will be cancelled. The recipient's link will stop working immediately.`,
      confirmLabel: 'Revoke',
      variant: 'danger',
    });
    if (!ok) return;
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
