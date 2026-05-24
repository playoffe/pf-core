'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Read actions (user-scoped) ────────────────────────────────────────────────

export async function getNotificationsAction(): Promise<{
  notifications?: Notification[];
  unreadCount?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { notifications: [], unreadCount: 0 };

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, is_read, created_at')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) return { error: error.message };

    const rows = (data ?? []) as Notification[];
    const unreadCount = rows.filter((n) => !n.is_read).length;
    return { notifications: rows, unreadCount };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function markNotificationReadAction(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('player_id', user.id);

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('player_id', user.id)
      .eq('is_read', false);

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── Write helpers (called internally from other actions via admin client) ─────

export async function createNotificationForPlayer(
  playerId: string,
  type: string,
  title: string,
  body?: string,
  link?: string,
) {
  try {
    const admin = createAdminClient();
    await admin.from('notifications').insert({
      player_id: playerId,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    });
  } catch {
    // Fire-and-forget — never block the calling action
  }
}

export async function createNotificationsForPlayers(
  playerIds: string[],
  type: string,
  title: string,
  body?: string,
  link?: string,
) {
  if (playerIds.length === 0) return;
  try {
    const admin = createAdminClient();
    await admin.from('notifications').insert(
      playerIds.map((player_id) => ({
        player_id,
        type,
        title,
        body: body ?? null,
        link: link ?? null,
      })),
    );
  } catch {
    // Fire-and-forget
  }
}
