'use server';

import { createAdminClient } from '@/lib/supabase/server';

/**
 * Check and award any newly-earned badges for a player.
 * Uses upsert so it is always safe to call multiple times.
 */
export async function awardBadgesForPlayer(playerId: string): Promise<void> {
  const admin = createAdminClient();

  // ── Global stats ──────────────────────────────────────────────────────────
  const { data: stats } = await admin
    .from('global_stats')
    .select('wins, losses, current_rating, peak_rating')
    .eq('player_id', playerId)
    .maybeSingle();

  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const totalMatches = wins + losses;
  const peakRating = stats?.peak_rating ?? 3.5;

  // ── Recent match results for streak check ─────────────────────────────────
  const { data: history } = await admin
    .from('match_history')
    .select('result')
    .eq('player_id', playerId)
    .order('played_at', { ascending: false })
    .limit(3);

  const recent = (history ?? []).map((h) => h.result);
  const hatTrick = recent.length === 3 && recent.every((r) => r === 'win');

  // ── Tournament champion check ──────────────────────────────────────────────
  // A player is a champion if one of their entries won the highest round in a category
  const isTournamentChampion = await (async () => {
    const { data: entries } = await admin
      .from('tournament_entries')
      .select('id, category_id')
      .eq('player_id', playerId);

    for (const entry of entries ?? []) {
      // Find the max round in the category
      const { data: maxRow } = await admin
        .from('matches')
        .select('round')
        .eq('category_id', entry.category_id)
        .order('round', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!maxRow) continue;

      // Check if this entry won a match at that max round
      const { count } = await admin
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', entry.category_id)
        .eq('round', maxRow.round)
        .eq('winner_entry_id', entry.id);

      if ((count ?? 0) > 0) return true;
    }
    return false;
  })();

  // ── Follower count ─────────────────────────────────────────────────────────
  const { count: followerCount } = await admin
    .from('player_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', playerId);

  // ── Determine earned badges ───────────────────────────────────────────────
  const toAward: string[] = [];

  if (totalMatches >= 1)          toAward.push('first_match');
  if (wins >= 1)                  toAward.push('first_win');
  if (wins >= 10)                 toAward.push('ten_wins');
  if (wins >= 50)                 toAward.push('fifty_wins');
  if (totalMatches >= 50)         toAward.push('veteran');
  if (hatTrick)                   toAward.push('hat_trick');
  if (peakRating >= 4.0)          toAward.push('rising_star');
  if (isTournamentChampion)       toAward.push('tournament_champion');
  if ((followerCount ?? 0) >= 10) toAward.push('well_connected');

  if (toAward.length === 0) return;

  await admin
    .from('player_badges')
    .upsert(
      toAward.map((slug) => ({ player_id: playerId, badge_slug: slug })),
      { onConflict: 'player_id,badge_slug', ignoreDuplicates: true },
    );
}

/** Return earned badge slugs for a player (for display). */
export async function getPlayerBadges(playerId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('player_badges')
    .select('badge_slug')
    .eq('player_id', playerId)
    .order('awarded_at', { ascending: true });

  return (data ?? []).map((b) => b.badge_slug);
}
