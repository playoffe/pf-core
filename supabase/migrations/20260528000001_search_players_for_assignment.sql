-- Search players by name, username, or email (superadmin use only — SECURITY DEFINER)
create or replace function search_players_for_assignment(p_query text, p_limit int default 10)
returns table(id uuid, full_name text, username text, email text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.username, p.email
  from players p
  where
    p.is_provisional = false
    and (
      p.full_name ilike '%' || p_query || '%'
      or p.username  ilike '%' || p_query || '%'
      or p.email     ilike '%' || p_query || '%'
    )
  order by p.full_name
  limit p_limit;
$$;
