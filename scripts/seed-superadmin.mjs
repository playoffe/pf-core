// Seed default superadmin account.
// Usage: node scripts/seed-superadmin.mjs
// Idempotent — safe to run multiple times.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPERADMIN_PASSWORD

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(join(__dirname, '../apps/web/package.json'));
const { createClient } = require('@supabase/supabase-js');

import { readFileSync } from 'fs';

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../apps/web/.env.local', import.meta.url), 'utf8');
    const entries = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      entries[key] = val;
    }
    return entries;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = process.env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD     = process.env.SUPERADMIN_PASSWORD ?? 'Playoffe@2026!';

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = 'admin@playoffe.com';

async function run() {
  // Check if user already exists
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) { console.error('listUsers:', listErr.message); process.exit(1); }

  let user = users.find(u => u.email === EMAIL);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Admin' },
    });
    if (error) { console.error('createUser:', error.message); process.exit(1); }
    user = data.user;
    console.log('✓ Created', EMAIL);
  } else {
    console.log('✓', EMAIL, 'already exists');
  }

  // Ensure super_admin role in app_metadata
  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: 'super_admin' },
  });
  if (updateErr) { console.error('updateUserById:', updateErr.message); process.exit(1); }
  console.log('✓ app_metadata.role = super_admin');

  // Upsert players row
  const { error: playerErr } = await admin.from('players').upsert(
    { id: user.id, email: EMAIL, username: 'admin', full_name: 'Admin', gender: 'male', role: 'admin' },
    { onConflict: 'id' }
  );
  if (playerErr) { console.error('players upsert:', playerErr.message); process.exit(1); }
  console.log('✓ players row upserted');

  console.log('\nSuperadmin ready:', EMAIL);
}

run();
