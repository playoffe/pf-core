-- Enable Supabase Realtime for the matches table so clients can subscribe to
-- live bracket and scoring updates.
--
-- REPLICA IDENTITY FULL means the Realtime payload includes both old and new
-- column values, which lets the client detect what actually changed.

ALTER TABLE matches REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE matches;
