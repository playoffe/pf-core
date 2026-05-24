'use client';

/**
 * Subscribes to Supabase Realtime Postgres Changes for all matches in a
 * category.  Whenever any match row is inserted or updated, `router.refresh()`
 * is called so the server component re-renders with fresh data.
 *
 * Returns a `liveStatus` string so callers can show a connection indicator:
 *   'connecting' | 'live' | 'reconnecting' | 'offline'
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export function useRealtimeCategoryMatches(categoryId: string): LiveStatus {
  const router = useRouter();
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('connecting');
  // Keep a stable ref to router so the subscription closure never goes stale
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`category-matches:${categoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT (new Swiss round) + UPDATE (score/status change)
          schema: 'public',
          table: 'matches',
          filter: `category_id=eq.${categoryId}`,
        },
        () => {
          routerRef.current.refresh();
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
  }, [categoryId]);

  return liveStatus;
}
