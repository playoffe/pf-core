-- Phase 11A: Social media connections and posting preferences.
--
-- social_connections: stores per-player OAuth tokens for Instagram, Facebook, X.
-- WhatsApp uses a share-link model (no OAuth) so it has no row here.
-- NOTE: access_token / refresh_token should be encrypted in production
-- (AWS Secrets Manager or Supabase Vault). For Phase 11A these are plain text
-- scaffolding — encrypt before enabling live OAuth connections.

CREATE TABLE social_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'x')),
  platform_user_id      TEXT,
  platform_username     TEXT,
  platform_display_name TEXT,
  access_token          TEXT,   -- encrypt in prod
  refresh_token         TEXT,   -- encrypt in prod
  token_expires_at      TIMESTAMPTZ,
  scopes                TEXT[] NOT NULL DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, platform)
);

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- Players may read/write their own connections only
CREATE POLICY "social_connections: player manages own"
  ON social_connections FOR ALL
  USING  (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

-- Social posting preferences stored as JSONB in player_profiles.
-- Default: global pause off, no per-platform prefs configured.
ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS social_post_prefs JSONB NOT NULL DEFAULT '{"paused": false, "platforms": {}}'::jsonb;
