'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { headers, cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function hashPin(pin: string) {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

// ── Generate a referee PIN for a tournament ───────────────────────────────────
export async function createRefereePinAction(tournamentId: string, label: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();

  // Verify manager
  const { data: t } = await admin.from('tournaments').select('club_id, slug').eq('id', tournamentId).single();
  if (!t) return { error: 'Tournament not found' };

  const { data: mgr } = await admin.from('club_managers').select('role')
    .eq('club_id', t.club_id).eq('player_id', user.id).maybeSingle();
  if (!mgr) return { error: 'Permission denied' };

  // Generate a random 6-digit PIN
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const pinHash = hashPin(pin);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

  const { error } = await admin.from('tournament_referee_pins').insert({
    tournament_id: tournamentId,
    pin_hash: pinHash,
    label: label.trim() || 'Referee',
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (error) return { error: 'Failed to create PIN' };

  return { success: true, pin };
}

// ── Revoke a PIN ──────────────────────────────────────────────────────────────
export async function revokePinAction(pinId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  await admin.from('tournament_referee_pins').update({ is_revoked: true }).eq('id', pinId);
  revalidatePath('/');
  return { success: true };
}

// ── Validate a PIN and return tournament info ─────────────────────────────────
export async function validateRefereePinAction(pin: string) {
  const admin = createAdminClient();

  // Read caller IP
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // Check rate limit
  const { data: limit } = await (admin
    .from('pin_rate_limits' as any)
    .select('attempt_count, blocked_until')
    .eq('ip_address', ip)
    .maybeSingle()) as { data: { attempt_count: number; blocked_until: string | null } | null };

  if (limit?.blocked_until && new Date(limit.blocked_until) > new Date()) {
    return { success: false, error: 'Too many attempts. Please wait 5 minutes before trying again.' };
  }

  const pinHash = hashPin(pin);

  const { data } = await admin
    .from('tournament_referee_pins')
    .select('id, label, tournament_id, expires_at, is_revoked, tournaments(id, name, slug, status)')
    .eq('pin_hash', pinHash)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!data) {
    // Increment rate limit counter
    const now = new Date();
    if (!limit) {
      await (admin.from('pin_rate_limits' as any).insert({ ip_address: ip, attempt_count: 1 }));
    } else {
      const newCount = (limit.attempt_count ?? 0) + 1;
      const blockedUntil = newCount >= 3
        ? new Date(now.getTime() + 5 * 60 * 1000).toISOString()
        : null;
      await (admin.from('pin_rate_limits' as any)
        .update({ attempt_count: newCount, blocked_until: blockedUntil, updated_at: now.toISOString() })
        .eq('ip_address', ip));
    }
    return { success: false, error: 'Invalid or expired PIN' };
  }

  const tournament = data.tournaments as { id: string; name: string; slug: string; status: string } | null;
  if (!tournament) return { error: 'Tournament not found' };
  if (!['in_progress', 'draw_generated'].includes(tournament.status)) {
    return { error: 'Tournament is not currently in progress' };
  }

  // Reset rate limit on success
  await (admin.from('pin_rate_limits' as any).delete().eq('ip_address', ip));

  return {
    success: true,
    pinId: data.id,
    label: data.label,
    tournament,
  };
}

// ── Fetch in-progress matches for a tournament (by valid PIN) ─────────────────
export async function getRefereeMatchesAction(pin: string) {
  const validated = await validateRefereePinAction(pin);
  if (!validated.success || !validated.tournament) return { error: validated.error ?? 'Invalid PIN' };

  const admin = createAdminClient();
  const { data: matches } = await admin
    .from('matches')
    .select(`
      id, round, round_name, group_name, court, status, sets, winner_entry_id,
      ea:tournament_entries!entry_a_id(id, seed, players!player_id(full_name, username), partner:players!partner_id(full_name)),
      eb:tournament_entries!entry_b_id(id, seed, players!player_id(full_name, username), partner:players!partner_id(full_name))
    `)
    .eq('tournament_id', validated.tournament.id)
    .in('status', ['scheduled', 'in_progress'])
    .not('entry_a_id', 'is', null)
    .not('entry_b_id', 'is', null)
    .order('court', { ascending: true, nullsFirst: false })
    .order('round', { ascending: true });

  type EntryRaw = { id: string; seed: number | null; players: { full_name: string; username: string } | null; partner: { full_name: string } | null } | null;
  const formatted = (matches ?? []).map((m) => {
    const ea = m.ea as EntryRaw;
    const eb = m.eb as EntryRaw;
    return {
      id: m.id,
      round: m.round,
      round_name: m.round_name as string | null,
      group_name: m.group_name as string | null,
      court: m.court as number | null,
      status: m.status as string,
      sets: m.sets as { score_a: number; score_b: number }[],
      winner_entry_id: m.winner_entry_id as string | null,
      entry_a: ea ? {
        id: ea.id,
        seed: ea.seed,
        player_name: ea.players?.full_name ?? 'Unknown',
        partner_name: ea.partner?.full_name ?? null,
      } : null,
      entry_b: eb ? {
        id: eb.id,
        seed: eb.seed,
        player_name: eb.players?.full_name ?? 'Unknown',
        partner_name: eb.partner?.full_name ?? null,
      } : null,
    };
  });

  return { success: true, matches: formatted, tournament: validated.tournament };
}

// ── Score a match as referee (PIN-authenticated, no user session needed) ──────
export async function scoreMatchAsRefereeAction(
  matchId: string,
  pin: string,
  sets: { score_a: number; score_b: number }[],
  winnerEntryId: string,
) {
  const validated = await validateRefereePinAction(pin);
  if (!validated.success) return { error: validated.error ?? 'Invalid PIN' };

  const cookieStore = await cookies();
  const refereeName = cookieStore.get('referee_name')?.value ?? null;

  const admin = createAdminClient();

  // Verify the match belongs to this tournament
  const { data: match } = await admin
    .from('matches')
    .select('id, tournament_id, entry_a_id, entry_b_id, status')
    .eq('id', matchId)
    .eq('tournament_id', validated.tournament!.id)
    .single();

  if (!match) return { error: 'Match not found' };
  if (match.status === 'completed' || match.status === 'walkover') return { error: 'Match already completed' };
  if (winnerEntryId !== match.entry_a_id && winnerEntryId !== match.entry_b_id) return { error: 'Invalid winner' };

  // Update match — use admin to bypass RLS (referee has no user session)
  const { error: matchErr } = await admin
    .from('matches')
    .update({
      status: 'completed',
      sets: sets.map((s, i) => ({ set_number: i + 1, score_a: s.score_a, score_b: s.score_b })),
      winner_entry_id: winnerEntryId,
      completed_at: new Date().toISOString(),
      submitted_by_name: refereeName,
      submitted_via: 'guest_pin',
    })
    .eq('id', matchId);

  if (matchErr) return { error: 'Failed to save result: ' + matchErr.message };

  return { success: true };
}

// ── Start a referee session (store name in cookie + DB) ───────────────────────
export async function startRefereeSessionAction(pin: string, name: string) {
  'use server';
  const admin = createAdminClient();

  // Validate pin first
  const validation = await validateRefereePinAction(pin);
  if (!validation.success) return { error: validation.error ?? 'Invalid PIN' };

  // Create referee_sessions row
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await (admin.from('referee_sessions' as any).insert({
    tournament_id: validation.tournament?.id,
    pin_id: (validation as any).pinId,
    referee_name: name.trim(),
    expires_at: expiresAt.toISOString(),
    is_active: true,
  }));

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set('referee_name', name.trim(), {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return { success: true };
}
