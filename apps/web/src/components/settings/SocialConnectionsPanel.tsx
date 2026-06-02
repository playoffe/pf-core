'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectSocialAccountAction } from '@/lib/actions/social';
import {
  PLATFORM_META,
  type OAuthPlatform,
  type SocialConnectionPublic,
} from '@/lib/social-types';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

// All 4 platforms in display order
const ALL_PLATFORMS: (OAuthPlatform | 'whatsapp')[] = [
  'instagram',
  'facebook',
  'x',
  'whatsapp',
];

// Platform icon box colours
const ICON_BG: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-400',
  facebook: 'bg-blue-600',
  x: 'bg-slate-800',
  whatsapp: 'bg-green-600',
};

interface Props {
  connections: SocialConnectionPublic[];
  /** Called when the connection list changes so the parent page can update. */
  onConnectionChange?: () => void;
  /** Error/success message forwarded from OAuth redirect query params */
  flashMessage?: { type: 'success' | 'error'; platform?: string; message: string } | null;
}

export function SocialConnectionsPanel({
  connections,
  flashMessage,
}: Props) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const connectedSet = new Map(connections.map((c) => [c.platform, c]));

  async function handleDisconnect(platform: OAuthPlatform) {
    const ok = await confirm({
      title: `Disconnect ${PLATFORM_META[platform].label}?`,
      message: 'Auto-posting to this platform will stop. You can reconnect at any time.',
      confirmLabel: 'Disconnect',
      variant: 'danger',
    });
    if (!ok) return;

    setDisconnecting(platform);
    startTransition(async () => {
      const result = await disconnectSocialAccountAction(platform);
      if (result.error) {
        toast(result.error, 'error');
      } else {
        toast(`${PLATFORM_META[platform].label} disconnected`, 'success');
        router.refresh();
      }
      setDisconnecting(null);
    });
  }

  return (
    <div className="rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
      {/* Header */}
      <div className="border-b border-surface-border px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Connected accounts</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Connect your social media accounts to enable auto-posting after match results and tournament milestones.
        </p>
      </div>

      {/* OAuth setup notice */}
      <div className="border-b border-surface-border bg-brand-950/40 px-5 py-3 flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-brand-400 text-xs">ℹ</span>
        <p className="text-xs text-slate-400">
          OAuth app credentials are configured by the platform administrator. Once approved, the Connect buttons below will activate.
        </p>
      </div>

      {/* Flash message from OAuth redirect */}
      {flashMessage && (
        <div
          className={`border-b border-surface-border px-5 py-3 text-xs font-medium ${
            flashMessage.type === 'success'
              ? 'bg-accent-500/10 text-accent-400'
              : 'bg-red-500/10 text-red-400'
          }`}
        >
          {flashMessage.message}
        </div>
      )}

      {/* Platform tiles */}
      <div className="divide-y divide-surface-border">
        {ALL_PLATFORMS.map((platform) => {
          const meta = PLATFORM_META[platform];
          const conn = connectedSet.get(platform as OAuthPlatform);
          const isConnected = !!conn;
          const isDisconnecting = disconnecting === platform;

          return (
            <div key={platform} className="flex items-center gap-4 px-5 py-4">
              {/* Icon */}
              <div
                className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white font-bold text-sm ${ICON_BG[platform]}`}
              >
                {meta.abbr}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${meta.textColor}`}>{meta.label}</p>
                  {isConnected && (
                    <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-400 ring-1 ring-accent-500/20">
                      Connected
                    </span>
                  )}
                  {!meta.isOAuth && (
                    <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                      No login needed
                    </span>
                  )}
                </div>
                {isConnected && conn ? (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {conn.platform_display_name ?? conn.platform_username ?? 'Connected'}
                    {' · '}
                    Since {new Date(conn.connected_at).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                )}
              </div>

              {/* Action button */}
              {meta.isOAuth ? (
                isConnected ? (
                  <button
                    onClick={() => handleDisconnect(platform as OAuthPlatform)}
                    disabled={isDisconnecting}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-950/40 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                ) : (
                  <a
                    href={`/api/social/connect/${platform}`}
                    className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
                  >
                    Connect
                  </a>
                )
              ) : (
                /* WhatsApp — no connection required */
                <span className="shrink-0 rounded-lg bg-green-900/30 px-3 py-1.5 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                  Ready
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
