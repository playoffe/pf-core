-- Phase 11B: Social posting log + Supabase Storage bucket for rendered graphics.
--
-- social_post_log tracks every social media posting attempt end-to-end:
-- queued → generating → pending_preview → posting → posted | failed | skipped

CREATE TABLE social_post_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        UUID        REFERENCES players(id) ON DELETE SET NULL,
  platform         TEXT        NOT NULL CHECK (platform IN ('instagram', 'facebook', 'x', 'whatsapp')),
  trigger_type     TEXT        NOT NULL CHECK (trigger_type IN ('match_win', 'category_complete', 'tournament_complete', 'podium', 'wrap_up')),
  trigger_id       UUID,                         -- matchId / categoryId / tournamentId
  tournament_id    UUID        REFERENCES tournaments(id) ON DELETE SET NULL,
  caption          TEXT,                         -- final caption sent to platform
  caption_style    TEXT,                         -- hype / humble / ai / custom / …
  graphic_url      TEXT,                         -- Supabase Storage public CDN URL
  status           TEXT        NOT NULL DEFAULT 'queued'
                               CHECK (status IN (
                                 'queued', 'generating', 'pending_preview',
                                 'posting', 'posted', 'failed', 'skipped', 'preview_declined'
                               )),
  platform_post_id TEXT,                         -- ID returned by platform API on success
  error_message    TEXT,
  queued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_at     TIMESTAMPTZ,
  posted_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by player (history view) and by status (worker polling)
CREATE INDEX social_post_log_player_id_idx ON social_post_log (player_id);
CREATE INDEX social_post_log_status_idx    ON social_post_log (status)
  WHERE status IN ('queued', 'generating', 'pending_preview', 'posting');

ALTER TABLE social_post_log ENABLE ROW LEVEL SECURITY;

-- Players can read their own post history
CREATE POLICY "social_post_log: player reads own"
  ON social_post_log FOR SELECT
  USING (auth.uid() = player_id);

-- ── Supabase Storage bucket for rendered social graphics ─────────────────────
-- Bucket must be public so Instagram / Facebook can fetch images by URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-graphics',
  'social-graphics',
  true,
  10485760,   -- 10 MB limit per graphic
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Only the service role (workers) can write; anyone can read (public bucket)
CREATE POLICY "social_graphics: service role write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social-graphics');

CREATE POLICY "social_graphics: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-graphics');
