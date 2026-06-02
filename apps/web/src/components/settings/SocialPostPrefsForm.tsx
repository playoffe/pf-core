'use client';

import { useState, useTransition } from 'react';
import { saveSocialPostPrefsAction } from '@/lib/actions/social';
import {
  PLATFORM_META,
  CAPTION_STYLE_META,
  CAPTION_PLACEHOLDERS,
  DEFAULT_PLATFORM_PREFS,
  type SocialPlatform,
  type SocialPostPrefs,
  type PlatformPostPrefs,
  type CaptionStyle,
  type SocialConnectionPublic,
} from '@/lib/social-types';
import { useToast } from '@/components/ui/ToastProvider';

// Ordered platform list re-exported from types (we'll add it there)
const PREF_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'x', 'whatsapp'];

const ICON_BG: Record<SocialPlatform, string> = {
  instagram: 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-400',
  facebook:  'bg-blue-600',
  x:         'bg-slate-800',
  whatsapp:  'bg-green-600',
};

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 cursor-pointer select-none">
      {label && <span className="text-sm text-slate-300">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-brand-600' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ── Platform prefs section ────────────────────────────────────────────────────

function PlatformPrefsSection({
  platform,
  prefs,
  isConnected,
  globalPaused,
  onChange,
}: {
  platform: SocialPlatform;
  prefs: PlatformPostPrefs;
  isConnected: boolean;
  globalPaused: boolean;
  onChange: (updated: PlatformPostPrefs) => void;
}) {
  const meta = PLATFORM_META[platform];
  const [open, setOpen] = useState(false);

  function update(partial: Partial<PlatformPostPrefs>) {
    onChange({ ...prefs, ...partial });
  }

  function updateTrigger(key: keyof PlatformPostPrefs['triggers'], value: boolean) {
    onChange({ ...prefs, triggers: { ...prefs.triggers, [key]: value } });
  }

  // WhatsApp doesn't need a stored connection
  const canEnable = isConnected || platform === 'whatsapp';
  const effectivelyEnabled = prefs.enabled && !globalPaused && canEnable;

  return (
    <div className={`border-b border-surface-border last:border-b-0 ${globalPaused ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Platform row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Icon */}
        <div
          className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-white font-bold text-xs ${ICON_BG[platform]}`}
        >
          {meta.abbr}
        </div>

        {/* Label + status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${meta.textColor}`}>{meta.label}</p>
            {!canEnable && (
              <span className="text-xs text-slate-600">· Not connected</span>
            )}
            {effectivelyEnabled && (
              <span className="rounded-full bg-accent-500/10 px-1.5 py-0.5 text-xs text-accent-400">
                Active
              </span>
            )}
          </div>
          {!canEnable && (
            <p className="text-xs text-slate-600 mt-0.5">Connect this account to enable auto-posting.</p>
          )}
        </div>

        {/* Enable toggle */}
        <Toggle
          checked={prefs.enabled && canEnable}
          onChange={(v) => {
            update({ enabled: v });
            if (v && !open) setOpen(true);
          }}
        />

        {/* Expand/collapse */}
        {prefs.enabled && canEnable && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 text-xs text-slate-500 hover:text-slate-300 transition-colors px-1"
          >
            {open ? '▲ Less' : '▼ More'}
          </button>
        )}
      </div>

      {/* Expanded prefs */}
      {open && prefs.enabled && canEnable && (
        <div className="px-5 pb-5 space-y-5 bg-surface/30">
          {/* Triggers */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Post when
            </p>
            <div className="space-y-3">
              {(
                [
                  { key: 'match_win',            label: 'Match win',              desc: 'Every time you win a match.' },
                  { key: 'category_complete',     label: 'Category completed',     desc: "When your last match in a category is confirmed." },
                  { key: 'tournament_complete',   label: 'Tournament complete',    desc: 'When the organiser marks the full tournament done.' },
                  { key: 'milestones',            label: 'Milestones',             desc: '10th match, top 10 ranking, win streaks, etc.' },
                ] as { key: keyof PlatformPostPrefs['triggers']; label: string; desc: string }[]
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <Toggle
                    checked={prefs.triggers[key]}
                    onChange={(v) => updateTrigger(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Caption style */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Caption style
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CAPTION_STYLE_META) as [CaptionStyle, typeof CAPTION_STYLE_META[CaptionStyle]][]).map(
                ([style, styleMeta]) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => update({ caption_style: style })}
                    className={`text-left rounded-xl px-3 py-2.5 ring-1 transition-all ${
                      prefs.caption_style === style
                        ? 'bg-brand-600/20 ring-brand-500/50 text-white'
                        : 'bg-surface ring-surface-border text-slate-400 hover:ring-slate-500'
                    }`}
                  >
                    <p className="text-xs font-semibold">{styleMeta.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{styleMeta.description}</p>
                  </button>
                ),
              )}
            </div>

            {/* Caption preview */}
            {prefs.caption_style !== 'custom' && prefs.caption_style !== 'ai' && (
              <div className="mt-3 rounded-lg bg-surface ring-1 ring-surface-border px-3 py-2">
                <p className="text-xs text-slate-600 mb-1">Preview</p>
                <p className="text-xs text-slate-300 italic">
                  &ldquo;{CAPTION_STYLE_META[prefs.caption_style].example}&rdquo;
                </p>
              </div>
            )}

            {/* Custom template editor */}
            {prefs.caption_style === 'custom' && (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={3}
                  value={prefs.custom_template}
                  onChange={(e) => update({ custom_template: e.target.value })}
                  placeholder="Write your template using {placeholders}…"
                  className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none resize-none"
                />
                {/* Placeholder reference */}
                <div className="rounded-lg bg-surface ring-1 ring-surface-border px-3 py-2">
                  <p className="text-xs text-slate-500 mb-2">Available placeholders</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {CAPTION_PLACEHOLDERS.map(({ key, description }) => (
                      <button
                        key={key}
                        type="button"
                        title={description}
                        onClick={() =>
                          update({
                            custom_template: prefs.custom_template + key,
                          })
                        }
                        className="text-xs font-mono text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5">Click a placeholder to insert it.</p>
                </div>
              </div>
            )}
          </div>

          {/* Preview before post */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white">Preview before posting</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Receive a push notification to approve each post before it goes live.
                If off, posts fire automatically.
              </p>
            </div>
            <Toggle
              checked={prefs.preview_before_post}
              onChange={(v) => update({ preview_before_post: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function SocialPostPrefsForm({
  initialPrefs,
  connections,
}: {
  initialPrefs: SocialPostPrefs;
  connections: SocialConnectionPublic[];
}) {
  const [prefs, setPrefs] = useState<SocialPostPrefs>(initialPrefs);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const connectedSet = new Set(connections.map((c) => c.platform));

  function getPlatformPrefs(platform: SocialPlatform): PlatformPostPrefs {
    return prefs.platforms[platform] ?? { ...DEFAULT_PLATFORM_PREFS };
  }

  function updatePlatform(platform: SocialPlatform, updated: PlatformPostPrefs) {
    setPrefs((p) => ({
      ...p,
      platforms: { ...p.platforms, [platform]: updated },
    }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveSocialPostPrefsAction(prefs);
      if (result.error) {
        toast(result.error, 'error');
      } else {
        toast('Social posting preferences saved', 'success');
      }
    });
  }

  return (
    <div className="mt-6 rounded-xl bg-surface-card ring-1 ring-surface-border overflow-hidden">
      {/* Header + global pause */}
      <div className="flex items-center justify-between gap-4 border-b border-surface-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Auto-posting preferences</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure what to post, when, and in what style for each platform.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {prefs.paused && (
            <span className="text-xs font-medium text-amber-400">All paused</span>
          )}
          <Toggle
            checked={!prefs.paused}
            onChange={(active) => setPrefs((p) => ({ ...p, paused: !active }))}
          />
        </div>
      </div>

      {/* Paused banner */}
      {prefs.paused && (
        <div className="border-b border-surface-border bg-amber-950/20 px-5 py-3">
          <p className="text-xs text-amber-400">
            ⏸ All auto-posting is paused. Toggle the switch above to resume.
          </p>
        </div>
      )}

      {/* Per-platform sections */}
      <div>
        {PREF_PLATFORMS.map((platform) => (
          <PlatformPrefsSection
            key={platform}
            platform={platform}
            prefs={getPlatformPrefs(platform)}
            isConnected={connectedSet.has(platform as 'instagram' | 'facebook' | 'x')}
            globalPaused={prefs.paused}
            onChange={(updated) => updatePlatform(platform, updated)}
          />
        ))}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 border-t border-surface-border px-5 py-4 bg-surface/30">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save preferences'}
        </button>
        <p className="text-xs text-slate-600">Changes apply to all future auto-posts.</p>
      </div>
    </div>
  );
}
