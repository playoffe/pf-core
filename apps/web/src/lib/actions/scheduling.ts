'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface ScheduleUpdate {
  matchId: string;
  scheduledTime: string | null; // ISO UTC string, or null to clear
  court: number | null;
}

export async function batchScheduleMatchesAction(
  tournamentSlug: string,
  updates: ScheduleUpdate[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (updates.length === 0) return { success: true, count: 0 };

  const admin = createAdminClient();

  // Resolve tournament id + verify organiser
  const { data: t } = await admin
    .from('tournaments')
    .select('id, club_id')
    .eq('slug', tournamentSlug)
    .single();
  if (!t) return { error: 'Tournament not found' };

  const { data: mgr } = await admin
    .from('club_managers')
    .select('role')
    .eq('club_id', t.club_id)
    .eq('player_id', user.id)
    .maybeSingle();
  if (!mgr) return { error: 'Permission denied' };

  // Parallel updates (each match independently)
  const results = await Promise.all(
    updates.map((u) =>
      admin
        .from('matches')
        .update({
          scheduled_time: u.scheduledTime ?? null,
          court: u.court ?? null,
        })
        .eq('id', u.matchId)
        .eq('tournament_id', t.id), // safety: only this tournament's matches
    ),
  );

  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    return { error: `${failed.length} update(s) failed: ${failed[0].error?.message}` };
  }

  revalidatePath(`/tournaments/${tournamentSlug}/schedule`);
  revalidatePath(`/tournaments/${tournamentSlug}/scoring`);
  revalidatePath(`/tournaments/${tournamentSlug}/analytics`);

  return { success: true, count: updates.length };
}
