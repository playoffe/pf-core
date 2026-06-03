'use client';

import { useState } from 'react';
import Image from 'next/image';
import { approvePreviewAction, declinePreviewAction } from '@/lib/actions/social';
import type { PostLogRow } from '@/lib/actions/social';
import { useToast } from '@/components/ui/ToastProvider';

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook:  'Facebook',
  x:         'X',
};

const TRIGGER_LABELS: Record<string, string> = {
  match_win:            '🏆 Match win',
  category_complete:    '🎯 Category complete',
  tournament_complete:  '🎾 Tournament complete',
};

interface Props {
  initialPreviews: PostLogRow[];
}

export function PendingPreviewsPanel({ initialPreviews }: Props) {
  const { toast } = useToast();
  const [previews, setPreviews] = useState(initialPreviews);
  const [acting, setActing] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setActing(id);
    const result = await approvePreviewAction(id);
    if (result.error) {
      toast(result.error, 'error');
    } else {
      setPreviews((prev) => prev.filter((p) => p.id !== id));
      toast('Post approved — sending now…', 'success');
    }
    setActing(null);
  }

  async function handleDecline(id: string) {
    setActing(id);
    const result = await declinePreviewAction(id);
    if (result.error) {
      toast(result.error, 'error');
    } else {
      setPreviews((prev) => prev.filter((p) => p.id !== id));
      toast('Post declined.', 'info');
    }
    setActing(null);
  }

  if (previews.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-amber-400 text-sm">📬</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Pending approval ({previews.length})
        </h2>
      </div>

      <div className="space-y-4">
        {previews.map((preview) => (
          <div
            key={preview.id}
            className="rounded-xl border border-amber-700/40 bg-amber-950/20 overflow-hidden"
          >
            <div className="flex gap-4 p-4">
              {/* Graphic thumbnail */}
              {preview.graphic_url && (
                <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-surface-card ring-1 ring-surface-border">
                  <Image
                    src={preview.graphic_url}
                    alt="Post graphic"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Platform + trigger */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded-full bg-surface-card px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-surface-border">
                    {PLATFORM_LABELS[preview.platform] ?? preview.platform}
                  </span>
                  <span className="text-xs text-slate-500">
                    {TRIGGER_LABELS[preview.trigger_type] ?? preview.trigger_type}
                  </span>
                </div>

                {/* Caption preview */}
                {preview.caption && (
                  <p className="text-sm text-slate-300 line-clamp-2 mb-3">
                    {preview.caption}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(preview.id)}
                    disabled={acting === preview.id}
                    className="rounded-lg bg-accent-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-700 transition-colors disabled:opacity-50"
                  >
                    {acting === preview.id ? '…' : '✓ Post now'}
                  </button>
                  <button
                    onClick={() => handleDecline(preview.id)}
                    disabled={acting === preview.id}
                    className="rounded-lg border border-slate-600 px-4 py-1.5 text-xs text-slate-400 hover:border-red-600 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {acting === preview.id ? '…' : '✕ Decline'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
