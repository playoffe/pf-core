import { redirect } from 'next/navigation';
import { createClient, isSuperAdmin } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';
import { SuperAdminNav } from '@/components/layout/SuperAdminNav';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isSuperAdmin(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300 uppercase tracking-widest">
            Super Admin
          </span>
        </div>
        <SuperAdminNav />
        {children}
      </main>
    </div>
  );
}
