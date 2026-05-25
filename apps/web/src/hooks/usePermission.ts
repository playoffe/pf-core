import { useContext } from 'react';
import { PermissionContext } from '@/components/PermissionProvider';

/** Check if the current user (in any of their roles) has a permission. */
export function usePermission(feature: string, subFeature?: string) {
  const { permissions } = useContext(PermissionContext);
  const sub = subFeature ?? '';
  // Check all keys matching *:feature:sub — any role match grants access
  const matches = Object.entries(permissions)
    .filter(([k]) => k.endsWith(`:${feature}:${sub}`))
    .map(([, v]) => v);

  if (matches.length === 0) return { enabled: false, canRead: false, canWrite: false };

  return {
    enabled: matches.some(m => m.enabled),
    canRead: matches.some(m => m.canRead),
    canWrite: matches.some(m => m.canWrite),
  };
}

/** Check if a platform feature module is enabled globally. */
export function useFeatureFlag(module: string): boolean {
  const { featureFlags } = useContext(PermissionContext);
  return featureFlags[module] ?? true; // default to enabled if not loaded yet
}
