'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface PracticeLogInput {
  practice_date: string;       // YYYY-MM-DD
  duration_minutes: string;    // string from form, coerce to int
  drill_types: string[];
  notes: string;
  partner_id: string | null;   // optional UUID
}

export async function createPracticeLogAction(input: PracticeLogInput) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const duration = input.duration_minutes ? parseInt(input.duration_minutes, 10) : null;
  if (duration !== null && (isNaN(duration) || duration <= 0 || duration > 480)) {
    return { error: 'Duration must be between 1 and 480 minutes' };
  }

  const { error } = await supabase.from('practice_logs').insert({
    player_id: user.id,
    practice_date: input.practice_date,
    duration_minutes: duration,
    drill_types: input.drill_types.filter(Boolean),
    notes: input.notes.trim().slice(0, 1000) || null,
    partner_id: input.partner_id || null,
  });

  if (error) return { error: error.message };

  revalidatePath('/practice');
  return { success: true };
}

export async function updatePracticeLogAction(id: string, input: PracticeLogInput) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const duration = input.duration_minutes ? parseInt(input.duration_minutes, 10) : null;
  if (duration !== null && (isNaN(duration) || duration <= 0 || duration > 480)) {
    return { error: 'Duration must be between 1 and 480 minutes' };
  }

  const { error } = await supabase
    .from('practice_logs')
    .update({
      practice_date: input.practice_date,
      duration_minutes: duration,
      drill_types: input.drill_types.filter(Boolean),
      notes: input.notes.trim().slice(0, 1000) || null,
      partner_id: input.partner_id || null,
    })
    .eq('id', id)
    .eq('player_id', user.id); // RLS guard

  if (error) return { error: error.message };

  revalidatePath('/practice');
  return { success: true };
}

export async function deletePracticeLogAction(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('practice_logs')
    .delete()
    .eq('id', id)
    .eq('player_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/practice');
  return { success: true };
}

export async function getPracticeLogsAction() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('practice_logs')
    .select('id, practice_date, duration_minutes, drill_types, notes, partner_id, created_at')
    .eq('player_id', user.id)
    .order('practice_date', { ascending: false })
    .limit(100);

  return data ?? [];
}
