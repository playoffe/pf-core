'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Persists the active role mode (admin | player) in a cookie so that server
 * components (AppNav, dashboard page) can read it without touching localStorage.
 */
export async function setActiveModeAction(mode: 'admin' | 'player') {
  const c = await cookies();
  c.set('active_mode', mode, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false,             // readable by client JS too
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}
