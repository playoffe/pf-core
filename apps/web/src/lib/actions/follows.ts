'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Follow a player. Safe to call multiple times (upsert).
 */
export async function followPlayerAction(followingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  if (user.id === followingId) return { error: 'Cannot follow yourself' };

  const { error } = await supabase
    .from('player_follows')
    .upsert({ follower_id: user.id, following_id: followingId }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true });

  if (error) return { error: error.message };

  // Check if the followed player now has 10+ followers — award badge
  const admin = createAdminClient();
  const { count } = await admin
    .from('player_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', followingId);

  if ((count ?? 0) >= 10) {
    await admin
      .from('player_badges')
      .upsert(
        [{ player_id: followingId, badge_slug: 'well_connected' }],
        { onConflict: 'player_id,badge_slug', ignoreDuplicates: true },
      );
  }

  // Resolve username for revalidation
  const { data: targetPlayer } = await admin
    .from('players')
    .select('username')
    .eq('id', followingId)
    .maybeSingle();

  if (targetPlayer?.username) revalidatePath(`/p/${targetPlayer.username}`);
  revalidatePath('/feed');

  return { success: true };
}

/**
 * Unfollow a player.
 */
export async function unfollowPlayerAction(followingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('player_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId);

  if (error) return { error: error.message };

  const admin = createAdminClient();
  const { data: targetPlayer } = await admin
    .from('players')
    .select('username')
    .eq('id', followingId)
    .maybeSingle();

  if (targetPlayer?.username) revalidatePath(`/p/${targetPlayer.username}`);
  revalidatePath('/feed');

  return { success: true };
}

/**
 * Check if the current user is following a given player.
 */
export async function getIsFollowing(followingId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from('player_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id)
    .eq('following_id', followingId);

  return (count ?? 0) > 0;
}
