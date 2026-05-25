-- Phase 9: Player development — practice logger + doubles partner matching

-- ── practice_logs ─────────────────────────────────────────────────────────────
create table if not exists practice_logs (
  id               uuid        primary key default gen_random_uuid(),
  player_id        uuid        not null references players(id) on delete cascade,
  practice_date    date        not null,
  duration_minutes integer     check (duration_minutes > 0 and duration_minutes <= 480),
  drill_types      text[]      not null default '{}',
  notes            text        check (length(notes) <= 1000),
  partner_id       uuid        references players(id),
  created_at       timestamptz not null default now()
);

create index if not exists practice_logs_player_date_idx on practice_logs(player_id, practice_date desc);

-- ── partner_requests ──────────────────────────────────────────────────────────
create table if not exists partner_requests (
  id             uuid        primary key default gen_random_uuid(),
  from_player_id uuid        not null references players(id) on delete cascade,
  to_player_id   uuid        not null references players(id) on delete cascade,
  status         text        not null default 'pending'
                             check (status in ('pending', 'accepted', 'declined')),
  message        text        check (length(message) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (from_player_id, to_player_id),
  check (from_player_id <> to_player_id)
);

create index if not exists partner_requests_from_idx on partner_requests(from_player_id);
create index if not exists partner_requests_to_idx   on partner_requests(to_player_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table practice_logs    enable row level security;
alter table partner_requests enable row level security;

-- Practice logs: owner only (private by default)
create policy "practice_own_all" on practice_logs
  for all using (auth.uid() = player_id);

-- Partner requests: sender can insert/delete; recipient can update (accept/decline);
-- both parties can read
create policy "partner_req_select" on partner_requests
  for select using (auth.uid() = from_player_id or auth.uid() = to_player_id);

create policy "partner_req_insert" on partner_requests
  for insert with check (auth.uid() = from_player_id);

create policy "partner_req_update" on partner_requests
  for update using (auth.uid() = to_player_id);

create policy "partner_req_delete" on partner_requests
  for delete using (auth.uid() = from_player_id);
