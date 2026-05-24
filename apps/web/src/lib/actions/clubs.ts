'use server';

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export interface CreateClubInput {
  name: string;
  city?: string;
  location?: string;
  description?: string;
  brand_primary_color?: string;
}

export async function createClubAction(input: CreateClubInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { name, city, location, description, brand_primary_color = '#7c3aed' } = input;

  if (!name || name.trim().length < 2) {
    return { error: 'Club name must be at least 2 characters' };
  }

  const admin = createAdminClient();

  // Generate a unique slug
  const baseSlug = slugify(name.trim());
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const { data: existing } = await admin
      .from('clubs')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const { data: club, error: clubError } = await admin
    .from('clubs')
    .insert({
      name: name.trim(),
      slug,
      city: city?.trim() || null,
      location: location?.trim() || null,
      description: description?.trim() || null,
      brand_primary_color,
      brand_secondary_color: '#22c55e',
    })
    .select('id')
    .single();

  if (clubError || !club) {
    return { error: 'Failed to create club. Please try again.' };
  }

  // Register creator as owner
  await admin.from('club_managers').insert({
    club_id: club.id,
    player_id: user.id,
    role: 'owner',
  });

  redirect(`/clubs/${club.id}`);
}

// ── Club manager management ───────────────────────────────────────────────────

export async function getClubManagers(clubId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('club_managers')
    .select('role, added_at, players!player_id(id, full_name, username, photo_url)')
    .eq('club_id', clubId)
    .order('added_at', { ascending: true });
  return (data ?? []).map((m) => ({
    role: m.role as string,
    added_at: m.added_at as string,
    player: m.players as { id: string; full_name: string; username: string; photo_url: string | null } | null,
  }));
}

export async function addClubManagerAction(clubId: string, username: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();

  // Verify caller is owner of this club
  const { data: myRole } = await admin
    .from('club_managers')
    .select('role')
    .eq('club_id', clubId)
    .eq('player_id', user.id)
    .maybeSingle();
  if (!myRole || myRole.role !== 'owner') return { error: 'Only club owners can add managers.' };

  // Look up the target player by username
  const { data: target } = await admin
    .from('players')
    .select('id, full_name')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();
  if (!target) return { error: `No player found with username @${username}.` };
  if (target.id === user.id) return { error: 'You are already a manager of this club.' };

  // Check not already a manager
  const { data: existing } = await admin
    .from('club_managers')
    .select('id')
    .eq('club_id', clubId)
    .eq('player_id', target.id)
    .maybeSingle();
  if (existing) return { error: `${target.full_name} is already a manager of this club.` };

  const { error } = await admin.from('club_managers').insert({
    club_id: clubId,
    player_id: target.id,
    role: 'manager',
  });
  if (error) return { error: 'Failed to add manager. Please try again.' };

  return { success: true, playerName: target.full_name };
}

export async function removeClubManagerAction(clubId: string, playerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();

  // Verify caller is owner
  const { data: myRole } = await admin
    .from('club_managers')
    .select('role')
    .eq('club_id', clubId)
    .eq('player_id', user.id)
    .maybeSingle();
  if (!myRole || myRole.role !== 'owner') return { error: 'Only club owners can remove managers.' };

  if (playerId === user.id) return { error: 'You cannot remove yourself as owner.' };

  await admin.from('club_managers').delete().eq('club_id', clubId).eq('player_id', playerId);

  return { success: true };
}

export async function getMyClubs() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from('club_managers')
    .select('clubs(id, name, slug, brand_primary_color, city, location)')
    .eq('player_id', user.id)
    .order('added_at', { ascending: false });

  return (data ?? []).flatMap((m) => (m.clubs ? [m.clubs] : []));
}
