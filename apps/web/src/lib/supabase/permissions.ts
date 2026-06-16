import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
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

export const getPermissionsData = cache(async (): Promise<PermissionsData> => {
  noStore();
  try {
    const user = await getCurrentUser();
    const userRoles = (user?.app_metadata?.roles as string[] | undefined) ?? [];

    if (userRoles.length === 0) {
      const { data: flags } = await (createAdminClient().from('feature_flags') as any)
        .select('feature_module, is_enabled');
      const featureFlags: Record<string, boolean> = {};
      for (const f of (flags ?? []) as FlagRow[]) {
        featureFlags[f.feature_module] = f.is_enabled;
      }
      return { permissions: {}, featureFlags };
    }

    const admin = createAdminClient();
    const [{ data: perms }, { data: flags }] = await Promise.all([
      (admin.from('role_permissions') as any)
        .select('role, feature, sub_feature, is_enabled, can_read, can_write, scope, club_id')
        .in('role', userRoles),
      (admin.from('feature_flags') as any)
        .select('feature_module, is_enabled'),
    ]);

    const map: Record<string, PermEntry> = {};
    for (const p of (perms ?? []) as PermRow[]) {
      if (p.scope !== 'global') continue;
      const k = `${p.role}:${p.feature}:${p.sub_feature ?? ''}`;
      map[k] = { enabled: p.is_enabled, canRead: p.can_read, canWrite: p.can_write };
    }

    const featureFlags: Record<string, boolean> = {};
    for (const f of (flags ?? []) as FlagRow[]) {
      featureFlags[f.feature_module] = f.is_enabled;
    }

    return { permissions: map, featureFlags };
  } catch {
    return { permissions: {}, featureFlags: {} };
  }
});
