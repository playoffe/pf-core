'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { updateRolePermissionAction, resetClubPermissionsAction } from '@/lib/actions/superadmin';

interface Permission {
  id: string;
  role: string;
  feature: string;
  sub_feature: string | null;
  is_enabled: boolean;
  can_read: boolean;
  can_write: boolean;
  scope: string;
  club_id: string | null;
}

interface Props {
  permissions: Permission[];
  clubs: Array<{ id: string; name: string }>;
  selectedClubId?: string;
}

// Feature categories matching PRD Section 27.5
const CATEGORIES: Record<string, { label: string; features: Array<{ key: string; sub: string; label: string }> }> = {
  tournament_management: {
    label: 'Tournament Management',
    features: [
      { key: 'tournament_management', sub: 'create',            label: 'Create tournament' },
      { key: 'tournament_management', sub: 'edit',              label: 'Edit tournament settings' },
      { key: 'tournament_management', sub: 'delete',            label: 'Delete tournament' },
      { key: 'tournament_management', sub: 'publish_results',   label: 'Publish / unpublish results' },
      { key: 'tournament_management', sub: 'manage_categories', label: 'Manage categories' },
      { key: 'tournament_management', sub: 'generate_draw',     label: 'Generate draw' },
      { key: 'tournament_management', sub: 'manage_draw',       label: 'Manage draw (edit seeding)' },
      { key: 'tournament_management', sub: 'register_players',  label: 'Register players' },
      { key: 'tournament_management', sub: 'view_details',      label: 'View tournament details' },
    ],
  },
  match_scheduling: {
    label: 'Match Scheduling',
    features: [
      { key: 'match_scheduling', sub: 'auto_generate',  label: 'Auto-generate schedule' },
      { key: 'match_scheduling', sub: 'manual_edit',    label: 'Manually edit schedule' },
      { key: 'match_scheduling', sub: 'assign_courts',  label: 'Assign courts' },
      { key: 'match_scheduling', sub: 'view_full',      label: 'View full schedule' },
      { key: 'match_scheduling', sub: 'view_personal',  label: 'View personal schedule' },
    ],
  },
  score_entry: {
    label: 'Score Entry & Match Management',
    features: [
      { key: 'score_entry', sub: 'enter_live',       label: 'Enter live scores (referee)' },
      { key: 'score_entry', sub: 'enter_organizer',  label: 'Enter scores (organiser)' },
      { key: 'score_entry', sub: 'self_report',      label: 'Self-report score (player)' },
      { key: 'score_entry', sub: 'override',         label: 'Override / correct scores' },
      { key: 'score_entry', sub: 'resolve_dispute',  label: 'Resolve disputed scores' },
      { key: 'score_entry', sub: 'view_live',        label: 'View live scores' },
      { key: 'score_entry', sub: 'lock_scores',      label: 'Lock match scores' },
      { key: 'score_entry', sub: 'walkover',         label: 'Mark walkover / retired' },
    ],
  },
  live_tournament: {
    label: 'Live Tournament Features',
    features: [
      { key: 'live_tournament', sub: 'view_bracket',       label: 'View live bracket' },
      { key: 'live_tournament', sub: 'view_standings',     label: 'View standings / leaderboard' },
      { key: 'live_tournament', sub: 'control_display',    label: 'Control display screen' },
      { key: 'live_tournament', sub: 'send_announcements', label: 'Send announcements' },
    ],
  },
  player_profile: {
    label: 'Player Profile & Network',
    features: [
      { key: 'player_profile', sub: 'create_edit_own',     label: 'Create / edit own profile' },
      { key: 'player_profile', sub: 'view_others',         label: 'View other player profiles' },
      { key: 'player_profile', sub: 'career_achievements', label: 'Career history & achievements' },
      { key: 'player_profile', sub: 'certifications',      label: 'Certifications' },
      { key: 'player_profile', sub: 'endorsements',        label: 'Skill endorsements' },
      { key: 'player_profile', sub: 'analytics',           label: 'Player analytics dashboard' },
      { key: 'player_profile', sub: 'head_to_head',        label: 'Head-to-head stats' },
      { key: 'player_profile', sub: 'practice_logger',     label: 'Practice session logger' },
      { key: 'player_profile', sub: 'partner_matching',    label: 'Partner matching' },
    ],
  },
  social: {
    label: 'Social & Content',
    features: [
      { key: 'social', sub: 'view_feed',      label: 'Activity feed (view)' },
      { key: 'social', sub: 'post_content',   label: 'Post content' },
      { key: 'social', sub: 'like_comment',   label: 'Like / comment on posts' },
      { key: 'social', sub: 'follow',         label: 'Follow players / clubs' },
      { key: 'social', sub: 'direct_message', label: 'Direct messaging' },
      { key: 'social', sub: 'report_content', label: 'Report content' },
    ],
  },
  analytics: {
    label: 'Analytics & Rankings',
    features: [
      { key: 'analytics', sub: 'organizer_dashboard', label: 'Organiser analytics dashboard' },
      { key: 'analytics', sub: 'rankings',            label: 'Cross-tournament rankings' },
      { key: 'analytics', sub: 'win_rate_stats',      label: 'Player win rate / stats' },
      { key: 'analytics', sub: 'geographic_heatmap',  label: 'Geographic heatmap' },
    ],
  },
  club_management: {
    label: 'Club Management',
    features: [
      { key: 'club_management', sub: 'edit_profile',   label: 'Edit club profile / branding' },
      { key: 'club_management', sub: 'view_page',      label: 'Club page (view)' },
      { key: 'club_management', sub: 'manage_members', label: 'Manage club members' },
      { key: 'club_management', sub: 'club_finder',    label: 'Club finder (browse)' },
      { key: 'club_management', sub: 'join_request',   label: 'Join club request' },
    ],
  },
};

const ROLES = ['admin', 'player', 'referee'] as const;
const ROLE_LABELS = { admin: 'Admin', player: 'Player', referee: 'Referee' };

function buildPermMap(permissions: Permission[], clubId?: string) {
  const map = new Map<string, Permission>();
  // First load globals
  for (const p of permissions) {
    if (p.scope === 'global') {
      map.set(`${p.role}:${p.feature}:${p.sub_feature ?? ''}`, p);
    }
  }
  // Then overlay club overrides
  if (clubId) {
    for (const p of permissions) {
      if (p.scope === 'club' && p.club_id === clubId) {
        map.set(`${p.role}:${p.feature}:${p.sub_feature ?? ''}`, p);
      }
    }
  }
  return map;
}

export function PermissionMatrix({ permissions, clubs, selectedClubId }: Props) {
  const router = useRouter();
  const [optimisticPerms, updateOptimistic] = useOptimistic(
    permissions,
    (state, update: Permission) =>
      state.map((p) => p.id === update.id ? update : p).concat(
        state.some((p) => p.id === update.id) ? [] : [update],
      ),
  );
  const [isPending, startTransition] = useTransition();

  const permMap = buildPermMap(optimisticPerms, selectedClubId);

  function getCell(role: string, feature: string, sub: string): { is_enabled: boolean; can_read: boolean; can_write: boolean; isOverride: boolean } {
    const clubKey = selectedClubId ? `${role}:${feature}:${sub}` : null;
    const p = permMap.get(`${role}:${feature}:${sub}`);
    const isOverride = !!selectedClubId && !!p && p.scope === 'club';
    return {
      is_enabled: p?.is_enabled ?? false,
      can_read: p?.can_read ?? false,
      can_write: p?.can_write ?? false,
      isOverride,
    };
  }

  function handleToggle(
    role: string,
    feature: string,
    sub: string,
    field: 'is_enabled' | 'can_read' | 'can_write',
  ) {
    const current = permMap.get(`${role}:${feature}:${sub}`);
    let { is_enabled, can_read, can_write } = current ?? { is_enabled: false, can_read: false, can_write: false };

    // Apply logic rules
    if (field === 'is_enabled') {
      is_enabled = !is_enabled;
      if (!is_enabled) { can_read = false; can_write = false; }
    } else if (field === 'can_read') {
      can_read = !can_read;
      if (!can_read) can_write = false;
    } else if (field === 'can_write') {
      can_write = !can_write;
      if (can_write) can_read = true;
    }

    const updatedPerm: Permission = {
      id: current?.id ?? `${role}:${feature}:${sub}`,
      role, feature, sub_feature: sub || null,
      is_enabled, can_read, can_write,
      scope: selectedClubId ? 'club' : 'global',
      club_id: selectedClubId ?? null,
      updated_at: new Date().toISOString(),
    };

    startTransition(async () => {
      updateOptimistic(updatedPerm);
      await updateRolePermissionAction({
        role, feature, subFeature: sub || undefined,
        isEnabled: is_enabled, canRead: can_read, canWrite: can_write,
        scope: selectedClubId ? 'club' : 'global',
        clubId: selectedClubId,
      });
    });
  }

  function handleResetToGlobal() {
    if (!selectedClubId) return;
    if (!window.confirm('Reset all permissions for this club to the global defaults? Club-specific overrides will be deleted.')) return;
    startTransition(async () => {
      await resetClubPermissionsAction(selectedClubId);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Scope toggle: global vs per-club */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => router.push('/superadmin/rbac')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            !selectedClubId ? 'bg-brand-600 text-white' : 'border border-surface-border text-slate-400 hover:text-slate-300'
          }`}
        >
          Global defaults
        </button>

        {clubs.map((club) => (
          <button
            key={club.id}
            onClick={() => router.push(`/superadmin/rbac?club=${club.id}`)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              selectedClubId === club.id ? 'bg-brand-600 text-white' : 'border border-surface-border text-slate-400 hover:text-slate-300'
            }`}
          >
            {club.name}
          </button>
        ))}

        {selectedClubId && (
          <button
            onClick={handleResetToGlobal}
            disabled={isPending}
            className="ml-auto rounded-lg border border-red-800/50 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-50"
          >
            Reset to global defaults
          </button>
        )}
      </div>

      {selectedClubId && (
        <p className="mb-4 text-xs text-slate-500">
          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-300 font-semibold text-[10px] uppercase tracking-wide">Override</span>
          {' '}badges indicate this club has a custom setting that differs from the global default.
        </p>
      )}

      {/* Permission matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="py-3 pr-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-64">
                Feature
              </th>
              {ROLES.map((role) => (
                <th key={role} colSpan={3} className="py-3 px-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
            <tr className="border-b border-surface-border/50">
              <th />
              {ROLES.map((role) => (
                <>
                  <th key={`${role}-e`} className="pb-2 px-2 text-[10px] text-slate-600 font-medium text-center">On</th>
                  <th key={`${role}-r`} className="pb-2 px-2 text-[10px] text-slate-600 font-medium text-center">Read</th>
                  <th key={`${role}-w`} className="pb-2 px-2 text-[10px] text-slate-600 font-medium text-center">Write</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(CATEGORIES).map(([catKey, cat]) => (
              <>
                {/* Category header row */}
                <tr key={catKey} className="border-t border-surface-border/30">
                  <td
                    colSpan={1 + ROLES.length * 3}
                    className="pt-5 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest"
                  >
                    {cat.label}
                  </td>
                </tr>

                {cat.features.map(({ key, sub, label }) => (
                  <tr key={`${key}:${sub}`} className="border-b border-surface-border/20 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-6 text-sm text-slate-300">{label}</td>

                    {ROLES.map((role) => {
                      const cell = getCell(role, key, sub);
                      return (
                        <>
                          {/* Enabled toggle */}
                          <td key={`${role}-e`} className="px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {cell.isOverride && (
                                <span className="rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-400">OVR</span>
                              )}
                              <Toggle
                                checked={cell.is_enabled}
                                disabled={isPending}
                                color="green"
                                onChange={() => handleToggle(role, key, sub, 'is_enabled')}
                              />
                            </div>
                          </td>
                          {/* Read toggle */}
                          <td key={`${role}-r`} className="px-2 text-center">
                            <Toggle
                              checked={cell.can_read}
                              disabled={isPending || !cell.is_enabled}
                              color="blue"
                              onChange={() => handleToggle(role, key, sub, 'can_read')}
                            />
                          </td>
                          {/* Write toggle */}
                          <td key={`${role}-w`} className="px-2 text-center">
                            <Toggle
                              checked={cell.can_write}
                              disabled={isPending || !cell.is_enabled || !cell.can_read}
                              color="amber"
                              onChange={() => handleToggle(role, key, sub, 'can_write')}
                            />
                          </td>
                        </>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toggle({
  checked, disabled, color, onChange,
}: {
  checked: boolean;
  disabled: boolean;
  color: 'green' | 'blue' | 'amber';
  onChange: () => void;
}) {
  const onColor = { green: 'bg-accent-500', blue: 'bg-blue-500', amber: 'bg-amber-500' }[color];

  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-checked={checked}
      role="switch"
      className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none disabled:opacity-30 ${
        checked ? onColor : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
