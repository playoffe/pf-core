'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { sendScoreReportedNotification } from '@/lib/email/notifications';
import { createNotificationsForPlayers } from './notifications';

interface SetScore {
  score_a: number;
  score_b: number;
}

export async function submitPlayerReportAction(
  matchId: string,
  reporterEntryId: string, // which entry is submitting (entry_a or entry_b)
  winnerEntryId: string,
  sets: SetScore[],
) {
  try {
    const admin = createAdminClient();

    // Validate the match exists and is in the right state
    const { data: match, error: matchErr } = await admin
      .from('matches')
      .select('id, status, entry_a_id, entry_b_id, tournament_id')
      .eq('id', matchId)
      .single();

    if (matchErr || !match) return { error: 'Match not found' };
    if (match.status === 'completed' || match.status === 'walkover') {
      return { error: 'This match has already been scored' };
    }
    if (match.status !== 'scheduled' && match.status !== 'in_progress') {
      return { error: 'Match is not available for reporting' };
    }

    // Ensure the reporter is one of the players
    if (reporterEntryId !== match.entry_a_id && reporterEntryId !== match.entry_b_id) {
      return { error: 'You are not a participant in this match' };
    }

    // Validate winner is one of the players
    if (winnerEntryId !== match.entry_a_id && winnerEntryId !== match.entry_b_id) {
      return { error: 'Invalid winner selection' };
    }

    // Validate sets (at least one, scores non-negative)
    if (!sets || sets.length === 0) return { error: 'At least one set score is required' };
    for (const s of sets) {
      if (s.score_a < 0 || s.score_b < 0) return { error: 'Scores must be non-negative' };
      if (s.score_a === s.score_b) return { error: 'A set cannot end in a tie' };
    }

    // Save the player-reported result
    const { error: updateErr } = await admin
      .from('matches')
      .update({
        player_reported_winner_id: winnerEntryId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        player_reported_sets: sets as any,
      })
      .eq('id', matchId);

    if (updateErr) return { error: updateErr.message };

    // Fetch tournament + category + organiser info for email + revalidation
    const { data: t } = await admin
      .from('tournaments')
      .select(`
        slug, name, club_id,
        tc:tournament_categories!inner(name),
        club_managers!club_id(player_id, players!player_id(email))
      `)
      .eq('id', match.tournament_id)
      .single();

    if (t?.slug) {
      revalidatePath(`/tournaments/${t.slug}/scoring`);
    }

    // Notify all club managers by email (fire-and-forget)
    if (t) {
      type ManagerRow = { player_id: string; players: { email: string } | null };
      const managers = (t.club_managers as unknown as ManagerRow[]) ?? [];
      const organiserEmails = managers
        .map((m) => m.players?.email)
        .filter((e): e is string => !!e);

      // Fetch player names for the match summary
      const { data: entries } = await admin
        .from('tournament_entries')
        .select('id, players!player_id(full_name)')
        .in('id', [match.entry_a_id, match.entry_b_id].filter((id): id is string => id !== null));

      const nameOf = (entryId: string) => {
        const e = entries?.find((x) => x.id === entryId);
        return (e?.players as { full_name: string } | null)?.full_name ?? 'Unknown';
      };

      const scoreStr = sets.map((s) => `${s.score_a}-${s.score_b}`).join(', ');
      const catName = (t.tc as unknown as { name: string }[] | null)?.[0]?.name ?? '';

      // In-app notification to managers
      const managerPlayerIds = managers
        .map((m) => m.player_id)
        .filter((id): id is string => !!id);
      if (managerPlayerIds.length > 0) {
        void createNotificationsForPlayers(
          managerPlayerIds,
          'score_reported',
          'Player score report',
          `${catName}: ${nameOf(match.entry_a_id ?? '')} vs ${nameOf(match.entry_b_id ?? '')} — ${scoreStr}`,
          `/tournaments/${t.slug}/scoring/${matchId}`,
        );
      }

      if (organiserEmails.length > 0) {
        void sendScoreReportedNotification({
          organiserEmails,
          tournamentName: t.name,
          tournamentSlug: t.slug,
          matchId,
          categoryName: catName,
          roundName: 'Match',
          playerA: nameOf(match.entry_a_id ?? ''),
          playerB: nameOf(match.entry_b_id ?? ''),
          reportedScore: scoreStr,
        });
      }
    }

    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getMatchForReportAction(matchId: string) {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('matches')
      .select(`
        id, status, round_name, player_reported_winner_id, player_reported_sets,
        ea:tournament_entries!entry_a_id(
          id,
          players!player_id(full_name)
        ),
        eb:tournament_entries!entry_b_id(
          id,
          players!player_id(full_name)
        ),
        tc:tournament_categories!category_id(name),
        t:tournaments!tournament_id(name, slug)
      `)
      .eq('id', matchId)
      .single();

    if (error || !data) return { error: 'Match not found' };

    type EntryWithPlayer = { id: string; players: { full_name: string } | null } | null;
    const ea = data.ea as EntryWithPlayer;
    const eb = data.eb as EntryWithPlayer;
    const tc = data.tc as { name: string } | null;
    const t = data.t as { name: string; slug: string } | null;

    return {
      match: {
        id: data.id,
        status: data.status,
        round_name: data.round_name,
        player_reported_winner_id: data.player_reported_winner_id,
        player_reported_sets: data.player_reported_sets,
        entry_a: ea ? { id: ea.id, name: ea.players?.full_name ?? 'Player A' } : null,
        entry_b: eb ? { id: eb.id, name: eb.players?.full_name ?? 'Player B' } : null,
        category_name: tc?.name ?? '',
        tournament_name: t?.name ?? '',
        tournament_slug: t?.slug ?? '',
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
