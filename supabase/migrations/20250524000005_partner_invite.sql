-- Partner invite token for doubles/mixed registration
ALTER TABLE tournament_entries
  ADD COLUMN IF NOT EXISTS partner_invite_token uuid DEFAULT gen_random_uuid() NOT NULL;

-- Unique index so we can look up an entry by token
CREATE UNIQUE INDEX IF NOT EXISTS tournament_entries_invite_token_idx
  ON tournament_entries (partner_invite_token);

-- Expose the invite token to anonymous readers (needed for the public invite page)
-- Access is still controlled by RLS; we rely on service-role for all writes.
