import type { DbClient } from '../types';

export async function getClubById(client: DbClient, clubId: string) {
  const { data, error } = await client.from('clubs').select('*').eq('id', clubId).single();
  if (error) throw error;
  return data;
}

export async function getClubMembers(client: DbClient, clubId: string) {
  const { data, error } = await client
    .from('club_affiliations')
    .select('*, players(id, username, full_name, photo_url, gender)')
    .eq('club_id', clubId)
    .order('is_current', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPlayerToClub(
  client: DbClient,
  playerId: string,
  clubId: string,
) {
  const { error: deactivateError } = await client
    .from('club_affiliations')
    .update({ is_current: false, left_at: new Date().toISOString() })
    .eq('player_id', playerId)
    .eq('club_id', clubId)
    .eq('is_current', true);

  if (deactivateError) throw deactivateError;

  const { data, error } = await client
    .from('club_affiliations')
    .insert({
      player_id: playerId,
      club_id: clubId,
      is_current: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
