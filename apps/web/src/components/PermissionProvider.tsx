'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface PermEntry {
  enabled: boolean;
  canRead: boolean;
  canWrite: boolean;
}

interface PermissionContextValue {
  permissions: Record<string, PermEntry>; // key: "role:feature:sub_feature"
  featureFlags: Record<string, boolean>;   // key: feature_module
  isLoaded: boolean;
}

export const PermissionContext = createContext<PermissionContextValue>({
  permissions: {},
  featureFlags: {},
  isLoaded: false,
});

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<Record<string, PermEntry>>({});
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const userRoles = (user?.app_metadata?.roles as string[] | undefined) ?? [];
      const clubId: string | null = null; // TODO: get from user context if needed

      const [{ data: perms }, { data: flags }] = await Promise.all([
        supabase.from('role_permissions' as any).select('role, feature, sub_feature, is_enabled, can_read, can_write, scope, club_id'),
        supabase.from('feature_flags' as any).select('feature_module, is_enabled'),
      ]);

      // Build permission map: for each role the user has, merge global then club overrides
      const map: Record<string, PermEntry> = {};
      const permRows = (perms ?? []) as Array<{
        role: string; feature: string; sub_feature: string | null;
        is_enabled: boolean; can_read: boolean; can_write: boolean;
        scope: string; club_id: string | null;
      }>;

      // Load globals first
      for (const p of permRows.filter(p => p.scope === 'global' && userRoles.includes(p.role))) {
        const k = `${p.role}:${p.feature}:${p.sub_feature ?? ''}`;
        map[k] = { enabled: p.is_enabled, canRead: p.can_read, canWrite: p.can_write };
      }
      // Overlay club overrides (if user belongs to a club — skip for now, global only)
      if (clubId) {
        for (const p of permRows.filter(p => p.scope === 'club' && p.club_id === clubId && userRoles.includes(p.role))) {
          const k = `${p.role}:${p.feature}:${p.sub_feature ?? ''}`;
          map[k] = { enabled: p.is_enabled, canRead: p.can_read, canWrite: p.can_write };
        }
      }

      const flagMap: Record<string, boolean> = {};
      for (const f of (flags ?? []) as Array<{ feature_module: string; is_enabled: boolean }>) {
        flagMap[f.feature_module] = f.is_enabled;
      }

      setPermissions(map);
      setFeatureFlags(flagMap);
      setIsLoaded(true);
    }
    load();
  }, []);

  return (
    <PermissionContext.Provider value={{ permissions, featureFlags, isLoaded }}>
      {children}
    </PermissionContext.Provider>
  );
}
