'use client';

import { createContext, useEffect, useState } from 'react';
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

interface PermissionProviderProps {
  children: ReactNode;
  initialPermissions?: Record<string, PermEntry>;
  initialFeatureFlags?: Record<string, boolean>;
}

export function PermissionProvider({
  children,
  initialPermissions,
  initialFeatureFlags,
}: PermissionProviderProps) {
  const hasInitial = initialPermissions !== undefined && initialFeatureFlags !== undefined;

  const [permissions, setPermissions] = useState<Record<string, PermEntry>>(initialPermissions ?? {});
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(initialFeatureFlags ?? {});
  const [isLoaded, setIsLoaded] = useState(hasInitial);

  useEffect(() => {
    // Skip client fetch when the server already provided initial data.
    if (hasInitial) return;

    async function load() {
      const supabase = createSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const userRoles = (user?.app_metadata?.roles as string[] | undefined) ?? [];

      const [{ data: perms }, { data: flags }] = await Promise.all([
        supabase.from('role_permissions' as any).select('role, feature, sub_feature, is_enabled, can_read, can_write, scope, club_id'),
        supabase.from('feature_flags' as any).select('feature_module, is_enabled'),
      ]);

      const map: Record<string, PermEntry> = {};
      const permRows = (perms ?? []) as Array<{
        role: string; feature: string; sub_feature: string | null;
        is_enabled: boolean; can_read: boolean; can_write: boolean;
        scope: string; club_id: string | null;
      }>;

      for (const p of permRows.filter(p => p.scope === 'global' && userRoles.includes(p.role))) {
        const k = `${p.role}:${p.feature}:${p.sub_feature ?? ''}`;
        map[k] = { enabled: p.is_enabled, canRead: p.can_read, canWrite: p.can_write };
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PermissionContext.Provider value={{ permissions, featureFlags, isLoaded }}>
      {children}
    </PermissionContext.Provider>
  );
}
