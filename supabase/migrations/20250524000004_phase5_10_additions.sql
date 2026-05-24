-- Phase 5: player self-reporting columns on matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS player_reported_winner_id uuid
    REFERENCES tournament_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player_reported_sets jsonb;

-- Phase 10: enable Realtime for display_state and announcements
--   (matches was already enabled in migration 20250524000003)
ALTER TABLE display_state REPLICA IDENTITY FULL;
ALTER TABLE announcements REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE display_state;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
  EXCEPTION WHEN others THEN NULL;
  END;
END;
$$;
