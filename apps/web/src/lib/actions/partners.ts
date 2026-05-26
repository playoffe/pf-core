'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function sendPartnerRequestAction(toPlayerId: string, message: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  if (user.id === toPlayerId) return { error: 'Cannot send request to yourself' };

  const { error } = await supabase
    .from('partner_requests')
    .insert({
      from_player_id: user.id,
      to_player_id: toPlayerId,
      message: message.trim().slice(0, 300) || null,
    });

  if (error) {
    if (error.code === '23505') return { error: 'You already have a pending request with this player' };
    return { error: error.message };
  }

  revalidatePath('/partners');
  return { success: true };
}

export async function respondToPartnerRequestAction(requestId: string, status: 'accepted' | 'declined') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('partner_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('to_player_id', user.id); // only recipient can respond

  if (error) return { error: error.message };

  revalidatePath('/partners');
  return { success: true };
}

export async function cancelPartnerRequestAction(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('partner_requests')
    .delete()
    .eq('id', requestId)
    .eq('from_player_id', user.id); // only sender can cancel

  if (error) return { error: error.message };

  revalidatePath('/partners');
  return { success: true };
}

export interface PartnerFilters {
  gender?: 'male' | 'female' | 'other';
  location?: string;
  format?: 'singles' | 'doubles';
}

/**
 * Fetch players suitable for doubles partner matching:
 * - Has global stats (has played matches)
 * - Rating within ±0.75 of the viewer's rating
 * - Excludes self and existing request targets
 * - Optional filters: gender, location (partial match), format preference
 * Returns up to 30 suggestions sorted by rating proximity.
 */
export async function getPartnerSuggestionsAction(filters?: PartnerFilters) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { players: [], myRating: null, sentIds: new Set<string>() };

  const admin = createAdminClient();

  // Get own rating
  const { data: myStats } = await supabase
    .from('global_stats')
    .select('current_rating')
    .eq('player_id', user.id)
    .maybeSingle();

  const myRating = myStats?.current_rating ?? 3.5;

  // Get existing sent request targets to exclude
  const { data: sentRequests } = await supabase
    .from('partner_requests')
    .select('to_player_id')
    .eq('from_player_id', user.id);

  const sentIds = new Set((sentRequests ?? []).map((r) => r.to_player_id));

  // Fetch candidate players (admin to bypass RLS on global_stats)
  let statsQ = admin
    .from('global_stats')
    .select('player_id, current_rating, wins, total_matches, win_rate, doubles_matches, doubles_wins, singles_matches')
    .gte('current_rating', myRating - 0.75)
    .lte('current_rating', myRating + 0.75)
    .gte('total_matches', 1)
    .neq('player_id', user.id);

  // Format filter on stats
  if (filters?.format === 'doubles') {
    statsQ = statsQ.gte('doubles_matches', 1);
  } else if (filters?.format === 'singles') {
    statsQ = statsQ.gte('singles_matches', 1);
  }

  const { data: candidates } = await statsQ.limit(120);

  const candidateIds = (candidates ?? [])
    .filter((c) => !sentIds.has(c.player_id))
    .map((c) => c.player_id);

  if (candidateIds.length === 0) {
    return { players: [], myRating, sentIds };
  }

  // Fetch player details with optional gender/location filters
  let playersQ = admin
    .from('players')
    .select('id, full_name, username, location, photo_url, gender')
    .in('id', candidateIds);

  if (filters?.gender) {
    playersQ = playersQ.eq('gender', filters.gender);
  }
  if (filters?.location?.trim()) {
    playersQ = playersQ.ilike('location', `%${filters.location.trim()}%`);
  }

  const { data: players } = await playersQ;

  const statsMap = new Map(
    (candidates ?? []).map((c) => [c.player_id, c]),
  );

  const result = (players ?? [])
    .map((p) => ({ ...p, stats: statsMap.get(p.id) ?? null }))
    .sort((a, b) => {
      const aDiff = Math.abs((a.stats?.current_rating ?? myRating) - myRating);
      const bDiff = Math.abs((b.stats?.current_rating ?? myRating) - myRating);
      return aDiff - bDiff;
    })
    .slice(0, 30);

  return { players: result, myRating, sentIds };
}
