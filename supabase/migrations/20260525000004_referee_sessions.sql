-- Referee Sessions, score attribution, and PIN rate limiting
-- PRD v10 Section 27.14 — Guest Referee PIN Access Enhancements

-- ─── Referee Sessions (tracks guest referee activity) ────────────────────────

create table referee_sessions (
  id                   uuid primary key default gen_random_uuid(),
  tournament_id        uuid not null references tournaments(id) on delete cascade,
  pin_id               uuid not null references tournament_referee_pins(id) on delete cascade,
  referee_name         text not null,
  issued_at            timestamptz not null default now(),
  expires_at           timestamptz not null,
  last_active_at       timestamptz,
  matches_scored_count integer not null default 0,
  is_active            boolean not null default true
);

create index referee_sessions_tournament_idx on referee_sessions (tournament_id);
create index referee_sessions_pin_idx        on referee_sessions (pin_id);
create index referee_sessions_active_idx     on referee_sessions (tournament_id, is_active);

-- RLS: admins of the tournament's club can read; writes via service role (admin client)
alter table referee_sessions enable row level security;
create policy "referee_sessions_club_manager_read" on referee_sessions
  for select using (
    exists (
      select 1 from tournaments t
      join club_managers cm on cm.club_id = t.club_id
      where t.id = referee_sessions.tournament_id
        and cm.player_id = auth.uid()
    )
  );

-- ─── PIN Rate Limiting (brute-force protection) ───────────────────────────────

create table pin_rate_limits (
  id               uuid primary key default gen_random_uuid(),
  ip_address       text not null,
  attempt_count    integer not null default 1,
  first_attempt_at timestamptz not null default now(),
  blocked_until    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index pin_rate_limits_ip_idx on pin_rate_limits (ip_address);
create index pin_rate_limits_blocked_idx   on pin_rate_limits (blocked_until) where blocked_until is not null;

-- RLS: only service role can read/write rate limit records
alter table pin_rate_limits enable row level security;

-- ─── Matches: add score attribution columns ───────────────────────────────────

alter table matches
  add column if not exists submitted_by_name text,
  add column if not exists submitted_via      text
    check (submitted_via in ('admin_web', 'referee_app', 'player_app', 'guest_pin'));

-- ─── Realtime: enable referee_sessions for live session tracking ──────────────

alter publication supabase_realtime add table referee_sessions;
