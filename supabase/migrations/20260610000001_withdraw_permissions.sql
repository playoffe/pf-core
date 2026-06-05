-- Seed role_permissions rows for the 'entries.withdraw' feature.
--
-- These rows control whether the admin and player roles can withdraw / remove
-- tournament entries. Super Admin can override them globally or per-club via
-- the /superadmin/rbac screen.
--
-- Defaults:
--   admin  → enabled  (admins can withdraw/remove entries by default)
--   player → enabled  (players can self-withdraw by default)

INSERT INTO role_permissions (role, feature, sub_feature, is_enabled, can_read, can_write, scope)
VALUES
  ('admin',  'entries', 'withdraw', true, true, true, 'global'),
  ('player', 'entries', 'withdraw', true, true, true, 'global')
ON CONFLICT (role, feature, sub_feature, scope, club_id) DO NOTHING;
