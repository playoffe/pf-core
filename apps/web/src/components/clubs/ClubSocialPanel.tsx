'use client';

import { useState } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { disconnectClubSocialAccountAction } from '@/lib/actions/social';
import type { ClubConnectionPublic } from '@/lib/actions/social';
import type { OAuthPlatform } from '@/lib/social-types';
import { PLATFORM_META } from '@/lib/social-types';
import { useRouter } from 'next/navigation';

const OAUTH_PLATFORMS: OAuthPlatform[] = ['instagram', 'facebook', 'x'];

interface Props {
  clubId: string;
  clubSlug: string;
  connections: ClubConnectionPublic[];
  /** Flash from `?connected=platform` / `?error=msg` redirect */
  flashMessage?: { type: 'success' | 'error'; message: string } | null;
}

export function ClubSocialPanel({ clubId, clubSlug, connections, flashMessage }: Props) {
  const router     = useRouter();
  const { confirm } = useConfirm();
  const [acting, setActing]     = useState<string | null>(null);
  const [flash, setFlash]       = useState(flashMessage ?? null);

  const connMap = new Map(connections.map((c) => [c.platform, c]));

  async function handleDisconnect(platform: OAuthPlatform) {
    const meta = PLATFORM_META[platform];
    if (!await confirm({
      title:        `Disconnect ${meta.label}?`,
      message:      `This will stop the club from posting to ${meta.label}. You can reconnect at any time.`,
      confirmLabel: 'Disconnect',
      variant:      'danger',
    })) return;

    setActing(platform);
    const result = await disconnectClubSocialAccountAction(clubId, platform);
    if (result.error) {
      setFlash({ type: 'error', message: result.error });
    } else {
      router.refresh();
    }
    setActing(null);
  }

  return (
    <div className="mt-8">
      <h2 className="mb-1 text-base font-semibold text-white">Social media</h2>
      <p className="mb-5 text-sm text-slate-400">
        Connect your club&apos;s social accounts so the platform can automatically post podium
        graphics and tournament wrap-ups after each category completes.
      </p>

      {flash && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
          flash.type === 'success'
            ? 'border-accent-700/40 bg-accent-950/20 text-accent-300'
            : 'border-red-700/40 bg-red-950/20 text-red-300'
        }`}>
          {flash.message}
          <button onClick={() => setFlash(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="space-y-3">
        {OAUTH_PLATFORMS.map((platform) => {
          const meta       = PLATFORM_META[platform];
          const connection = connMap.get(platform);
          const isConnected = !!connection;

          return (
            <div
              key={platform}
              className={`flex items-center justify-between rounded-xl p-4 ring-1 transition-all ${
                isConnected
                  ? `bg-surface-card ${meta.ringColor}`
                  : 'bg-surface-card ring-surface-border'
              }`}
            >
              {/* Platform info */}
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-sm font-bold ring-1 ring-surface-border ${meta.textColor}`}>
                  {meta.abbr}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${meta.textColor}`}>{meta.label}</p>
                  {isConnected ? (
                    <p className="text-xs text-slate-500">
                      {connection.platform_display_name ?? connection.platform_username ?? 'Connected'}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600">Not connected</p>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <span className="rounded-full bg-accent-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-400 ring-1 ring-accent-500/25">
                      Connected
                    </span>
                    <button
                      onClick={() => handleDisconnect(platform)}
                      disabled={acting === platform}
                      className="text-xs text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {acting === platform ? '…' : 'Disconnect'}
                    </button>
                  </>
                ) : (
                  <a
                    href={`/api/social/club/connect/${platform}?club=${clubSlug}`}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-500 hover:text-brand-300 transition-colors"
                  >
                    Connect →
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Club connections are used for organiser posting only (podium graphics, tournament wrap-ups).
        Individual player auto-posts use their personal connections in Settings → Social media.
      </p>
    </div>
  );
}
