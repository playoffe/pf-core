-- ── Extend entry_status_enum ────────────────────────────────────────────────
-- pending    = self-registered, awaiting manager approval
-- waitlisted = approved/auto spots full, queued for promotion
ALTER TYPE entry_status_enum ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE entry_status_enum ADD VALUE IF NOT EXISTS 'waitlisted';

-- ── Add auto_approve_entries to tournaments ──────────────────────────────────
-- When true  → self-registered entries go straight to active (or waitlisted if full)
-- When false → self-registered entries sit as pending until manager approves
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS auto_approve_entries boolean NOT NULL DEFAULT true;
