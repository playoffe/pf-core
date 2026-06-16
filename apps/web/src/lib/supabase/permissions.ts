import { cache } from 'react';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createAdminClient, getCurrentUser } from '@/lib/supabase/server';

interface PermEntry {
  enabled: boolean;
  canRead: boolean;
  canWrite: boolean;
}

export interface PermissionsData {
  permissions: Record<string, PermEntry>;
  featureFlags: Record<string, boolean>;
}

type PermRow = {
  role: string;
  feature: string;
  sub_feature: string | null;
  is_enabled: boolean;
  can_read: boolean;
  can_write: boolean;
  scope: string;
  club_id: string | null;
};

type FlagRow = { feature_module: string; is_enabled: boolean };

// Feature flags are global (same for all users) — cache for 5 min, invalidated
// whenever a super admin toggles a flag via updateFeatureFlagAction().
const getCachedFeatureFlags = unstable_cache(
  async (): Promise<Record<string, boolean>> => {
    const { data: flags } = await (createAdminClient().from('feature_flags') as any)
      .select('feature_module, is_enabled');
    const result: Record<string, boolean> = {};
    for (const f of (flags ?? []) as FlagRow[]) {
      result[f.feature_module] = f.is_enabled;
    }
    return result;
  },
  ['feature-flags'],
  { revalidate: 300, tags: ['feature-flags'] },
);

// Role permissions are the same for everyone with the same role set — cache per
// sorted role key for 5 min, invalidated when an admin edits permissions.
const getCachedRolePermissions = unstable_cache(
  async (roleKey: string, roles: string[]): Promise<Record<string, PermEntry>> => {
    const { data: perms } = await (createAdminClient().from('role_permissions') as any)
      .select('role, feature, sub_feature, is_enabled, can_read, can_write, scope, club_id')
      .in('role', roles);
    const map: Record<string, PermEntry> = {};
    for (const p of (perms ?? []) as PermRow[]) {
      if (p.scope !== 'global') continue;
      const k = `${p.role}:${p.feature}:${p.sub_feature ?? ''}`;
      map[k] = { enabled: p.is_enabled, canRead: p.can_read, canWrite: p.can_write };
    }
    return map;
    // roleKey is only used as a cache-key discriminator — suppress unused warning
    void roleKey;
  },
  ['role-permissions'],
  { revalidate: 300, tags: ['permissions'] },
);

// Per-request dedup via React cache() so multiple callers within the same render
// (layout + page + AppNav) share one result without extra DB queries.
export const getPermissionsData = cache(async (): Promise<PermissionsData> => {
  try {
    const user = await getCurrentUser();
    const userRoles = (user?.app_metadata?.roles as string[] | undefined) ?? [];

    const [featureFlags, permissions] = await Promise.all([
      getCachedFeatureFlags(),
      userRoles.length > 0
        ? getCachedRolePermissions(userRoles.slice().sort().join(','), userRoles)
        : Promise.resolve({} as Record<string, PermEntry>),
    ]);

    return { permissions, featureFlags };
  } catch {
    return { permissions: {}, featureFlags: {} };
  }
});

// Call these from the superadmin actions that write to these tables so the
// Next.js Data Cache is invalidated immediately instead of waiting for TTL.
export function revalidateFeatureFlags() {
  revalidateTag('feature-flags');
}

export function revalidatePermissions() {
  revalidateTag('permissions');
}
