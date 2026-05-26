-- Web Push subscription endpoints per player
create table push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  player_id  uuid        not null references players(id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);
create index on push_subscriptions (player_id);
alter table push_subscriptions enable row level security;
create policy "owner all" on push_subscriptions for all using (auth.uid() = player_id);
