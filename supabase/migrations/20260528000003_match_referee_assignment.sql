-- Add referee assignment to matches
-- Allows an admin to assign a named referee to a scheduled match before starting it.
alter table matches
  add column if not exists assigned_referee_name text;
