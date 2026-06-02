import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Returns whether a feature flag is enabled platform-wide.
 *
 * Wrapped in React's `cache()` so multiple server components in the same
 * render tree calling this for the same module only hit Supabase once.
 *
 * Defaults to `true` if the row is missing (safe — unknown flags don't block features).
 */
export const isFeatureEnabled = cache(async (module: string): Promise<boolean> => {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin.from('feature_flags') as any)
      .select('is_enabled')
      .eq('feature_module', module)
      .maybeSingle();
    return (data as { is_enabled: boolean } | null)?.is_enabled ?? true;
  } catch {
    return true; // never block a feature due to a DB read error
  }
});
