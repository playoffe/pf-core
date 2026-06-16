import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/server';
import { getNotificationPrefsAction } from '@/lib/actions/notifications';
import { NotificationPrefsForm } from '@/components/settings/NotificationPrefsForm';
import { PushSubscribeButton } from '@/components/settings/PushSubscribeButton';

export const metadata: Metadata = { title: 'Notification preferences' };

export default async function NotificationsSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?return=/settings/notifications');

  const prefs = await getNotificationPrefsAction();

  return (
    <>
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/settings/profile" className="hover:text-slate-300 transition-colors">Settings</Link>
        <span>/</span>
        <span className="text-slate-400">Notifications</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-white">Notification preferences</h1>

      {/* Push notifications */}
      <div className="mb-8 rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-5">
        <h2 className="mb-1 text-sm font-semibold text-white">Browser push notifications</h2>
        <p className="mb-4 text-xs text-slate-500">
          Receive real-time notifications even when the app is not open.
        </p>
        <PushSubscribeButton />
      </div>

      <NotificationPrefsForm initialPrefs={prefs} />
    </>
  );
}
