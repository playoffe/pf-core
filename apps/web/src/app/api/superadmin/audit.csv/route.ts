import { createAdminClient, createClient, getCurrentUser, isSuperAdmin } from '@/lib/supabase/server';

export async function GET() {
  // 1. Auth check
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) {
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Fetch all audit log entries
  const admin = createAdminClient();
  const { data: entries } = await (admin.from('audit_log' as any)
    .select('id, action_type, actor_id, target_type, target_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10000)) as { data: Array<{ id: string; action_type: string; actor_id: string | null; target_type: string | null; target_id: string | null; created_at: string }> | null };

  // 3. Build CSV
  const header = 'id,action_type,actor_id,target_type,target_id,created_at';
  const rows = (entries ?? []).map((e) => {
    const escape = (v: string | null) => v == null ? '' : v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v;
    return [escape(e.id), escape(e.action_type), escape(e.actor_id), escape(e.target_type), escape(e.target_id), escape(e.created_at)].join(',');
  });
  const csv = [header, ...rows].join('\n');

  // 4. Return CSV response
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="audit-log.csv"',
    },
  });
}
