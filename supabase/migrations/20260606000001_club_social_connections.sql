-- Phase 11 (remaining): Club-level social connections for organiser posting.
-- Mirrors social_connections (player-scoped) but scoped to clubs.
-- Used by the podium worker to post category/tournament wrap-up graphics
-- to the club's official social media pages.

CREATE TABLE club_social_connections (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  platform              TEXT        NOT NULL CHECK (platform IN ('instagram', 'facebook', 'x')),
  platform_user_id      TEXT,
  platform_username     TEXT,
  platform_display_name TEXT,
  access_token          TEXT,       -- encrypt in prod (AWS Secrets Manager / Supabase Vault)
  refresh_token         TEXT,
  token_expires_at      TIMESTAMPTZ,
  scopes                TEXT[]      NOT NULL DEFAULT '{}',
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  connected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, platform)
);

ALTER TABLE club_social_connections ENABLE ROW LEVEL SECURITY;

-- Any club manager / owner may read the connection status (no tokens exposed)
CREATE POLICY "club_social_connections: club manager reads"
  ON club_social_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_managers cm
      WHERE cm.club_id = club_social_connections.club_id
        AND cm.player_id = auth.uid()
    )
  );

-- Only service role (workers + OAuth callbacks) may write
-- (INSERT / UPDATE / DELETE require service role key — RLS has no permissive write policy)
