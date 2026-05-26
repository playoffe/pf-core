-- Feed posts: user-generated posts with image support
create table feed_posts (
  id          uuid        primary key default gen_random_uuid(),
  player_id   uuid        not null references players(id) on delete cascade,
  body        text        not null check (char_length(body) between 1 and 500),
  image_url   text,
  created_at  timestamptz not null default now()
);
create index on feed_posts (player_id, created_at desc);
create index on feed_posts (created_at desc);
alter table feed_posts enable row level security;
create policy "public read"  on feed_posts for select using (true);
create policy "owner insert" on feed_posts for insert with check (auth.uid() = player_id);
create policy "owner delete" on feed_posts for delete using (auth.uid() = player_id);

-- Post likes
create table post_likes (
  post_id    uuid        not null references feed_posts(id) on delete cascade,
  player_id  uuid        not null references players(id)   on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, player_id)
);
alter table post_likes enable row level security;
create policy "public read"  on post_likes for select using (true);
create policy "owner insert" on post_likes for insert with check (auth.uid() = player_id);
create policy "owner delete" on post_likes for delete using (auth.uid() = player_id);

-- Post comments
create table post_comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references feed_posts(id) on delete cascade,
  player_id  uuid        not null references players(id)   on delete cascade,
  body       text        not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index on post_comments (post_id, created_at);
alter table post_comments enable row level security;
create policy "public read"  on post_comments for select using (true);
create policy "owner insert" on post_comments for insert with check (auth.uid() = player_id);
create policy "owner delete" on post_comments for delete using (auth.uid() = player_id);
