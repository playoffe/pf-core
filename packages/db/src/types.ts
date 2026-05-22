import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Canonical client type for all DB query helpers.
 * Derived from @supabase/ssr so it is compatible with both
 * createBrowserClient (client components) and createServerClient (server / middleware).
 */
export type DbClient = ReturnType<typeof createBrowserClient<Database>>;
