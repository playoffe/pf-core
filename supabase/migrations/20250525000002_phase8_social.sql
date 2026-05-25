-- Phase 8: Social layer — badges, follows

-- ── player_badges ─────────────────────────────────────────────────────────────
create table if not exists player_badges (
  id          uuid        primary key default gen_random_uuid(),
  player_id   uuid        not null references players(id) on delete cascade,
  badge_slug  text        not null,
  awarded_at  timestamptz not null default now(),
  unique (player_id, badge_slug)
);

create index if not exists player_badges_player_id_idx on player_badges(player_id);

-- ── player_follows ────────────────────────────────────────────────────────────
create table if not exists player_follows (
  id           uuid        primary key default gen_random_uuid(),
  follower_id  uuid        not null references players(id) on delete cascade,
  following_id uuid        not null references players(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists player_follows_follower_idx  on player_follows(follower_id);
create index if not exists player_follows_following_idx on player_follows(following_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table player_badges  enable row level security;
alter table player_follows enable row level security;

-- Badges: public read, no direct write (awarded by server)
create policy "badges_public_read"  on player_badges  for select using (true);
create policy "badges_service_write" on player_badges for all using (auth.role() = 'service_role');

-- Follows: public read, authenticated users manage their own follows
create policy "follows_public_read"  on player_follows for select using (true);
create policy "follows_own_insert"   on player_follows for insert with check (auth.uid() = follower_id);
create policy "follows_own_delete"   on player_follows for delete using  (auth.uid() = follower_id);
