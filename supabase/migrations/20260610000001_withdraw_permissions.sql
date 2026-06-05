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
SELECT 'admin', 'entries', 'withdraw', true, true, true, 'global'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions
  WHERE role = 'admin' AND feature = 'entries' AND sub_feature = 'withdraw' AND scope = 'global' AND club_id IS NULL
);

INSERT INTO role_permissions (role, feature, sub_feature, is_enabled, can_read, can_write, scope)
SELECT 'player', 'entries', 'withdraw', true, true, true, 'global'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions
  WHERE role = 'player' AND feature = 'entries' AND sub_feature = 'withdraw' AND scope = 'global' AND club_id IS NULL
);
