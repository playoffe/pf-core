import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  getSocialConnectionsAction,
  getSocialPostPrefsAction,
} from '@/lib/actions/social';
import { SocialConnectionsPanel } from '@/components/settings/SocialConnectionsPanel';
import { SocialPostPrefsForm } from '@/components/settings/SocialPostPrefsForm';

export const metadata: Metadata = { title: 'Social media · PLAYOFFE' };

interface Props {
  searchParams: Promise<{
    connected?: string;
    error?: string;
    platform?: string;
  }>;
}

export default async function SocialSettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?return=/settings/social');

  const sp = await searchParams;

  // Resolve flash message from OAuth redirect
  type FlashMessage = {
    type: 'success' | 'error';
    platform?: string;
    message: string;
  } | null;

  let flashMessage: FlashMessage = null;

  if (sp.connected) {
    const label = sp.connected.charAt(0).toUpperCase() + sp.connected.slice(1);
    flashMessage = {
      type: 'success',
      platform: sp.connected,
      message: `✓ ${label} connected successfully.`,
    };
  } else if (sp.error) {
    const errorMessages: Record<string, string> = {
      not_configured: `OAuth credentials not yet configured for ${sp.platform ?? 'this platform'}. Contact the platform administrator.`,
      invalid_platform: 'Unknown platform — please try again.',
      missing_code: 'OAuth flow did not return a code. Please try connecting again.',
      invalid_state: 'Session mismatch — please try again.',
      session_mismatch: 'You appear to be logged in as a different user. Please sign in again.',
    };
    flashMessage = {
      type: 'error',
      message: errorMessages[sp.error] ?? `Connection error: ${sp.error}`,
    };
  }

  const [connections, prefs] = await Promise.all([
    getSocialConnectionsAction(),
    getSocialPostPrefsAction(),
  ]);

  return (
    <>
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/settings/profile" className="hover:text-slate-300 transition-colors">
          Settings
        </Link>
        <span>/</span>
        <span className="text-slate-400">Social media</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-white">Social media</h1>
      <p className="mb-8 text-sm text-slate-400">
        Connect your accounts and configure auto-posting for match wins, tournament results,
        and player milestones.
      </p>

      {/* Connected accounts */}
      <SocialConnectionsPanel connections={connections} flashMessage={flashMessage} />

      {/* Posting preferences */}
      <SocialPostPrefsForm initialPrefs={prefs} connections={connections} />
    </>
  );
}
