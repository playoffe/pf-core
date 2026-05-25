'use client';

import { useState, useTransition } from 'react';
import { followPlayerAction, unfollowPlayerAction } from '@/lib/actions/follows';

interface Props {
  targetId: string;
  initialIsFollowing: boolean;
  initialCount: number;
}

export function FollowButton({ targetId, initialIsFollowing, initialCount }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (isFollowing) {
        const res = await unfollowPlayerAction(targetId);
        if (!res.error) {
          setIsFollowing(false);
          setCount((c) => Math.max(0, c - 1));
        }
      } else {
        const res = await followPlayerAction(targetId);
        if (!res.error) {
          setIsFollowing(true);
          setCount((c) => c + 1);
        }
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'bg-brand-600/20 border border-brand-600/40 text-brand-300 hover:bg-red-900/20 hover:border-red-700/40 hover:text-red-400'
          : 'bg-brand-600 text-white hover:bg-brand-700'
      }`}
    >
      {isPending ? '…' : isFollowing ? 'Following' : 'Follow'}
      <span className="opacity-70">{count}</span>
    </button>
  );
}
