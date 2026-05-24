'use client';

/**
 * Subscribes to Supabase Realtime for a single match row.
 *
 * Used on the scoring page so that if another device (or a server action on a
 * different tab) completes the match, the UI automatically reflects the new
 * state without the scorer needing to reload.
 *
 * Behaviour:
 * - While the match is still in_progress / scheduled: watches for an external
 *   status transition to 'completed' or 'walkover' and calls `onExternalComplete`.
 * - Returns the same LiveStatus indicator as the category hook.
 */

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LiveStatus } from './useRealtimeCategoryMatches';

interface MatchPayload {
  new: {
    status: string;
    winner_entry_id: string | null;
  };
}

interface Options {
  /** Current local status — if already completed we skip the subscription. */
  currentStatus: string;
  /** Called when an external UPDATE transitions the match to completed/walkover. */
  onExternalComplete: (winnerId: string | null) => void;
}

export function useRealtimeMatch(
  matchId: string,
  { currentStatus, onExternalComplete }: Options,
): LiveStatus {
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('connecting');
  const callbackRef = useRef(onExternalComplete);
  callbackRef.current = onExternalComplete;
  const currentStatusRef = useRef(currentStatus);
  currentStatusRef.current = currentStatus;

  useEffect(() => {
    // No point subscribing if the match is already over
    if (currentStatus === 'completed' || currentStatus === 'walkover') {
      setLiveStatus('live'); // treat as connected — nothing to watch
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload: MatchPayload) => {
          const newStatus = payload.new?.status;
          const local = currentStatusRef.current;
          // Only react to external completions — ignore our own submissions which
          // already update local state synchronously via handleSubmit/handleWalkover.
          if (
            (newStatus === 'completed' || newStatus === 'walkover') &&
            local !== 'completed' &&
            local !== 'walkover'
          ) {
            callbackRef.current(payload.new.winner_entry_id ?? null);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setLiveStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setLiveStatus('offline');
        else if (status === 'CLOSED') setLiveStatus('reconnecting');
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // Re-run only if matchId changes (status changes don't need a new channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  return liveStatus;
}
