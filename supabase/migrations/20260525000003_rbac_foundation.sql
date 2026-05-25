-- RBAC Foundation: user_roles, role_permissions, feature_flags, admin_invites, audit_log
-- PRD v10 Section 27 — Super Admin & Role-Based Access Control

-- ─── User Roles (multi-role support — one row per role per user) ──────────────

create table user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  role        text not null check (role in ('super_admin', 'admin', 'player')),
  club_id     uuid references clubs(id) on delete cascade, -- null for player / super_admin
  is_active   boolean not null default true,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users
);

create index user_roles_user_idx    on user_roles (user_id);
create index user_roles_club_idx    on user_roles (club_id);
create unique index user_roles_unique_idx on user_roles (user_id, role, club_id)
  where club_id is not null;
create unique index user_roles_unique_global_idx on user_roles (user_id, role)
  where club_id is null;

-- RLS: users can read their own roles; writes done via service role only
alter table user_roles enable row level security;
create policy "user_roles_read_own" on user_roles for select using (auth.uid() = user_id);

-- ─── Role Permissions (the RBAC permission matrix) ───────────────────────────

create table role_permissions (
  id          uuid primary key default gen_random_uuid(),
  role        text not null check (role in ('admin', 'player', 'referee')),
  feature     text not null,
  sub_feature text,                                        -- null = top-level feature
  is_enabled  boolean not null default true,
  can_read    boolean not null default true,
  can_write   boolean not null default false,
  scope       text not null check (scope in ('global', 'club')),
  club_id     uuid references clubs(id) on delete cascade, -- null for global scope
  updated_by  uuid references auth.users,
  updated_at  timestamptz not null default now()
);

create index role_permissions_role_idx  on role_permissions (role);
create index role_permissions_club_idx  on role_permissions (club_id);
create unique index role_permissions_global_idx on role_permissions (role, feature, coalesce(sub_feature, ''), scope)
  where club_id is null;
create unique index role_permissions_club_idx2  on role_permissions (role, feature, coalesce(sub_feature, ''), club_id)
  where club_id is not null;

-- RLS: anyone authenticated can read; writes via service role only
alter table role_permissions enable row level security;
create policy "role_permissions_read_all" on role_permissions for select using (auth.role() = 'authenticated');

-- ─── Seed: Default Permission Matrix (PRD Section 27.5) ──────────────────────
-- Legend: is_enabled=true/can_read=true/can_write=true = R+W
--         is_enabled=true/can_read=true/can_write=false = Read
--         is_enabled=false = disabled

insert into role_permissions (role, feature, sub_feature, is_enabled, can_read, can_write, scope) values
  -- Tournament Management
  ('admin',   'tournament_management', 'create',           true,  true,  true,  'global'),
  ('admin',   'tournament_management', 'edit',             true,  true,  true,  'global'),
  ('admin',   'tournament_management', 'delete',           true,  true,  true,  'global'),
  ('admin',   'tournament_management', 'publish_results',  true,  true,  true,  'global'),
  ('admin',   'tournament_management', 'manage_categories',true,  true,  true,  'global'),
  ('admin',   'tournament_management', 'generate_draw',    true,  true,  true,  'global'),
  ('admin',   'tournament_management', 'manage_draw',      true,  true,  true,  'global'),
  ('admin',   'tournament_management', 'register_players', true,  true,  true,  'global'),
  ('admin',   'tournament_management', 'view_details',     true,  true,  true,  'global'),
  ('player',  'tournament_management', 'view_details',     true,  true,  false, 'global'),
  ('referee', 'tournament_management', 'view_details',     true,  true,  false, 'global'),

  -- Match Scheduling
  ('admin',   'match_scheduling', 'auto_generate',   true,  true,  true,  'global'),
  ('admin',   'match_scheduling', 'manual_edit',     true,  true,  true,  'global'),
  ('admin',   'match_scheduling', 'assign_courts',   true,  true,  true,  'global'),
  ('admin',   'match_scheduling', 'view_full',       true,  true,  true,  'global'),
  ('player',  'match_scheduling', 'view_full',       true,  true,  false, 'global'),
  ('player',  'match_scheduling', 'view_personal',   true,  true,  false, 'global'),
  ('referee', 'match_scheduling', 'view_full',       true,  true,  false, 'global'),

  -- Score Entry & Match Management
  ('admin',   'score_entry', 'enter_live',         true,  true,  true,  'global'),
  ('admin',   'score_entry', 'enter_organizer',    true,  true,  true,  'global'),
  ('admin',   'score_entry', 'self_report',        true,  true,  true,  'global'),
  ('admin',   'score_entry', 'override',           true,  true,  true,  'global'),
  ('admin',   'score_entry', 'resolve_dispute',    true,  true,  true,  'global'),
  ('admin',   'score_entry', 'view_live',          true,  true,  true,  'global'),
  ('admin',   'score_entry', 'lock_scores',        true,  true,  true,  'global'),
  ('admin',   'score_entry', 'walkover',           true,  true,  true,  'global'),
  ('player',  'score_entry', 'self_report',        false, false, false, 'global'), -- off by default
  ('player',  'score_entry', 'view_live',          true,  true,  false, 'global'),
  ('referee', 'score_entry', 'enter_live',         true,  true,  true,  'global'),
  ('referee', 'score_entry', 'view_live',          true,  true,  false, 'global'),
  ('referee', 'score_entry', 'walkover',           true,  true,  true,  'global'),

  -- Live Tournament Features
  ('admin',   'live_tournament', 'view_bracket',       true,  true,  true,  'global'),
  ('admin',   'live_tournament', 'view_standings',     true,  true,  true,  'global'),
  ('admin',   'live_tournament', 'control_display',    true,  true,  true,  'global'),
  ('admin',   'live_tournament', 'send_announcements', true,  true,  true,  'global'),
  ('player',  'live_tournament', 'view_bracket',       true,  true,  false, 'global'),
  ('player',  'live_tournament', 'view_standings',     true,  true,  false, 'global'),
  ('referee', 'live_tournament', 'view_bracket',       true,  true,  false, 'global'),
  ('referee', 'live_tournament', 'view_standings',     true,  true,  false, 'global'),

  -- Player Profile & Network
  ('admin',   'player_profile', 'create_edit_own',      true,  true,  true,  'global'),
  ('admin',   'player_profile', 'view_others',          true,  true,  false, 'global'),
  ('admin',   'player_profile', 'career_achievements',  true,  true,  true,  'global'),
  ('admin',   'player_profile', 'certifications',       true,  true,  true,  'global'),
  ('admin',   'player_profile', 'endorsements',         true,  true,  true,  'global'),
  ('admin',   'player_profile', 'analytics',            true,  true,  true,  'global'),
  ('admin',   'player_profile', 'head_to_head',         true,  true,  false, 'global'),
  ('player',  'player_profile', 'create_edit_own',      true,  true,  true,  'global'),
  ('player',  'player_profile', 'view_others',          true,  true,  false, 'global'),
  ('player',  'player_profile', 'career_achievements',  true,  true,  true,  'global'),
  ('player',  'player_profile', 'certifications',       true,  true,  true,  'global'),
  ('player',  'player_profile', 'endorsements',         true,  true,  true,  'global'),
  ('player',  'player_profile', 'analytics',            true,  true,  false, 'global'),
  ('player',  'player_profile', 'head_to_head',         true,  true,  false, 'global'),
  ('player',  'player_profile', 'practice_logger',      true,  true,  true,  'global'),
  ('player',  'player_profile', 'partner_matching',     true,  true,  true,  'global'),

  -- Social & Content
  ('admin',   'social', 'view_feed',      true,  true,  false, 'global'),
  ('admin',   'social', 'post_content',   true,  true,  true,  'global'),
  ('admin',   'social', 'like_comment',   true,  true,  true,  'global'),
  ('admin',   'social', 'follow',         true,  true,  true,  'global'),
  ('admin',   'social', 'direct_message', true,  true,  true,  'global'),
  ('admin',   'social', 'report_content', true,  true,  true,  'global'),
  ('player',  'social', 'view_feed',      true,  true,  false, 'global'),
  ('player',  'social', 'post_content',   true,  true,  true,  'global'),
  ('player',  'social', 'like_comment',   true,  true,  true,  'global'),
  ('player',  'social', 'follow',         true,  true,  true,  'global'),
  ('player',  'social', 'direct_message', true,  true,  true,  'global'),
  ('player',  'social', 'report_content', true,  true,  true,  'global'),

  -- Analytics & Rankings
  ('admin',   'analytics', 'organizer_dashboard', true,  true,  true,  'global'),
  ('admin',   'analytics', 'rankings',            true,  true,  false, 'global'),
  ('admin',   'analytics', 'win_rate_stats',      true,  true,  false, 'global'),
  ('player',  'analytics', 'rankings',            true,  true,  false, 'global'),
  ('player',  'analytics', 'win_rate_stats',      true,  true,  false, 'global'),
  ('player',  'analytics', 'geographic_heatmap',  true,  true,  false, 'global'),
  ('referee', 'analytics', 'rankings',            true,  true,  false, 'global'),

  -- Club Management
  ('admin',   'club_management', 'edit_profile',   true,  true,  true,  'global'),
  ('admin',   'club_management', 'view_page',      true,  true,  true,  'global'),
  ('admin',   'club_management', 'manage_members', true,  true,  true,  'global'),
  ('player',  'club_management', 'view_page',      true,  true,  false, 'global'),
  ('player',  'club_management', 'club_finder',    true,  true,  false, 'global'),
  ('player',  'club_management', 'join_request',   true,  true,  true,  'global');

-- ─── Feature Flags (platform-wide module on/off) ─────────────────────────────

create table feature_flags (
  id             uuid primary key default gen_random_uuid(),
  feature_module text not null unique,
  is_enabled     boolean not null default true,
  updated_by     uuid references auth.users,
  updated_at     timestamptz not null default now()
);

-- RLS: anyone authenticated can read; writes via service role only
alter table feature_flags enable row level security;
create policy "feature_flags_read_all" on feature_flags for select using (auth.role() = 'authenticated');

-- Seed: default feature flags (PRD Section 27.6)
insert into feature_flags (feature_module, is_enabled) values
  ('player_network',        true),
  ('social_media',          true),
  ('sponsor_marketplace',   true),
  ('tournament_display',    true),
  ('player_self_reporting', false), -- off by default per PRD
  ('direct_messaging',      true),
  ('partner_matching',      true),
  ('practice_logger',       true),
  ('ai_caption_generation', true),
  ('geographic_heatmap',    true);

-- ─── Admin Invites (Super Admin → Club Owner invite links) ───────────────────

create table admin_invites (
  id                uuid primary key default gen_random_uuid(),
  club_name         text not null,
  invitee_email     text not null,
  invitee_name      text,
  subscription_tier subscription_tier_enum not null default 'free',
  token             text not null unique,   -- signed UUID, single-use
  expires_at        timestamptz not null,
  claimed_at        timestamptz,
  revoked_at        timestamptz,
  created_by        uuid not null references auth.users,
  created_at        timestamptz not null default now()
);

create index admin_invites_token_idx on admin_invites (token);
create index admin_invites_email_idx on admin_invites (invitee_email);

-- RLS: only service role can read/write (super admin actions use admin client)
alter table admin_invites enable row level security;

-- ─── Audit Log (append-only, immutable) ─────────────────────────────────────

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  action_type text not null,
  actor_id    uuid references auth.users,
  target_type text,
  target_id   text,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_actor_idx      on audit_log (actor_id);
create index audit_log_action_idx     on audit_log (action_type);
create index audit_log_created_at_idx on audit_log (created_at desc);

-- RLS: INSERT only for service role; no UPDATE/DELETE for anyone
alter table audit_log enable row level security;
-- Note: service role bypasses RLS — these policies guard the authenticated role
create policy "audit_log_no_select" on audit_log for select using (false);  -- super admin reads via service role
create policy "audit_log_no_update" on audit_log for update using (false);
create policy "audit_log_no_delete" on audit_log for delete using (false);

-- ─── clubs: add is_suspended flag ────────────────────────────────────────────

alter table clubs add column if not exists is_suspended boolean not null default false;
