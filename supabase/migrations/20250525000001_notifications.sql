-- In-app notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  type        text        NOT NULL,   -- 'score_reported', 'match_result', 'draw_published', 'registration_approved', etc.
  title       text        NOT NULL,
  body        text,
  link        text,                   -- optional URL to navigate to on click
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_player_id_idx ON notifications(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_player_unread_idx ON notifications(player_id) WHERE is_read = false;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read own notifications"
  ON notifications FOR SELECT
  USING (player_id = auth.uid());

CREATE POLICY "Players can update own notifications"
  ON notifications FOR UPDATE
  USING (player_id = auth.uid());

-- Service role (admin client) can insert/delete freely (no policy needed for service_role)

-- Enable Realtime so the bell updates live
ALTER TABLE notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN others THEN NULL;
  END;
END;
$$;
