-- Allow anonymous / public reads of tournament_entries for live & completed
-- tournaments so the display screen can resolve player names without auth.
-- The existing entries_own_read policy covers authenticated users (self + managers).

CREATE POLICY "entries_public_read_live"
  ON tournament_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_entries.tournament_id
        AND t.status IN ('in_progress', 'completed')
    )
  );
