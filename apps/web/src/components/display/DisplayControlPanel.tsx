'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@pickleball/db';
import type { DisplaySlide } from '@pickleball/shared';
import {
  updateDisplaySlideAction,
  updateDisplayPausedAction,
  updateRotationIntervalAction,
  sendAnnouncementAction,
  dismissAnnouncementAction,
} from '@/lib/actions/display';

type DisplayState = Database['public']['Tables']['display_state']['Row'];
type Announcement = Database['public']['Tables']['announcements']['Row'];

interface Props {
  tournamentId: string;
  tournamentSlug: string;
  initialDisplayState: DisplayState;
  initialAnnouncements: Announcement[];
}

const SLIDES: { id: DisplaySlide; label: string; icon: string }[] = [
  { id: 'live_scores', label: 'Live Scores', icon: '🎾' },
  { id: 'upcoming_matches', label: 'Upcoming', icon: '📋' },
  { id: 'full_schedule', label: 'Full Schedule', icon: '📅' },
  { id: 'group_standings', label: 'Standings', icon: '📊' },
  { id: 'live_bracket', label: 'Bracket', icon: '🏆' },
  { id: 'category_podium', label: 'Podium', icon: '🥇' },
  { id: 'wrap_up', label: 'Wrap-Up', icon: '🎉' },
  { id: 'announcement', label: 'Announcement', icon: '📢' },
];

export function DisplayControlPanel({
  tournamentId,
  initialDisplayState,
  initialAnnouncements,
}: Props) {
  const [ds, setDs] = useState<DisplayState>(initialDisplayState);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Announcement form
  const [annMessage, setAnnMessage] = useState('');
  const [annUrgency, setAnnUrgency] = useState<'normal' | 'urgent'>('normal');
  const [sendingAnn, setSendingAnn] = useState(false);

  // Interval editing
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalValue, setIntervalValue] = useState(ds.rotation_interval_secs);

  // Live Realtime sync
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`ctrl:${tournamentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'display_state', filter: `tournament_id=eq.${tournamentId}` },
        (payload) => setDs(payload.new as DisplayState),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements', filter: `tournament_id=eq.${tournamentId}` },
        (payload) => setAnnouncements((prev) => [payload.new as Announcement, ...prev]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'announcements', filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          const updated = payload.new as Announcement;
          setAnnouncements((prev) =>
            updated.dismissed_at
              ? prev.filter((a) => a.id !== updated.id)
              : prev.map((a) => (a.id === updated.id ? updated : a)),
          );
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tournamentId]);

  async function handleSlide(slide: DisplaySlide, pin: boolean) {
    setLoading(slide);
    setError(null);
    const res = await updateDisplaySlideAction(tournamentId, slide, pin);
    if ('error' in res && res.error) setError(res.error);
    setLoading(null);
  }

  async function handlePause(paused: boolean) {
    setLoading('pause');
    setError(null);
    const res = await updateDisplayPausedAction(tournamentId, paused);
    if ('error' in res && res.error) setError(res.error);
    setLoading(null);
  }

  async function handleIntervalSave() {
    setLoading('interval');
    setError(null);
    const res = await updateRotationIntervalAction(tournamentId, intervalValue);
    if ('error' in res && res.error) setError(res.error);
    setEditingInterval(false);
    setLoading(null);
  }

  async function handleSendAnnouncement() {
    if (!annMessage.trim()) return;
    setSendingAnn(true);
    setError(null);
    const res = await sendAnnouncementAction(tournamentId, annMessage, annUrgency);
    if ('error' in res && res.error) {
      setError(res.error);
    } else {
      setAnnMessage('');
      setAnnUrgency('normal');
    }
    setSendingAnn(false);
  }

  async function handleDismiss(annId: string) {
    setLoading(annId);
    setError(null);
    const res = await dismissAnnouncementAction(tournamentId, annId);
    if ('error' in res && res.error) setError(res.error);
    setLoading(null);
  }

  const currentSlide = ds.current_slide as DisplaySlide;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Status strip */}
      <div className="rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Currently showing</p>
            <p className="mt-1 text-lg font-bold text-white">
              {SLIDES.find((s) => s.id === currentSlide)?.icon}{' '}
              {SLIDES.find((s) => s.id === currentSlide)?.label ?? currentSlide}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {ds.is_pinned && (
                <span className="rounded-full bg-brand-600/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
                  📌 Pinned
                </span>
              )}
              {ds.is_paused && (
                <span className="rounded-full bg-amber-600/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  ⏸ Paused
                </span>
              )}
              {!ds.is_pinned && !ds.is_paused && (
                <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-semibold text-accent-400">
                  ▶ Rotating
                </span>
              )}
            </div>
          </div>

          {/* Rotation controls */}
          <div className="flex items-center gap-3">
            {/* Pause / Resume */}
            <button
              onClick={() => handlePause(!ds.is_paused)}
              disabled={loading === 'pause' || ds.is_pinned}
              title={ds.is_pinned ? 'Unpin a slide first to control rotation' : undefined}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-500 hover:text-brand-400 transition-colors disabled:opacity-40"
            >
              {loading === 'pause' ? '…' : ds.is_paused ? '▶ Resume' : '⏸ Pause'}
            </button>

            {/* Interval */}
            {editingInterval ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Number(e.target.value))}
                  className="w-16 rounded-lg border border-slate-700 bg-surface-card px-2 py-1.5 text-center text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500">sec</span>
                <button
                  onClick={handleIntervalSave}
                  disabled={loading === 'interval'}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {loading === 'interval' ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingInterval(false)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingInterval(true); setIntervalValue(ds.rotation_interval_secs); }}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
              >
                {ds.rotation_interval_secs}s interval
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slide selector */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Switch slide
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SLIDES.map((slide) => {
            const isActive = currentSlide === slide.id;
            const isPinned = isActive && ds.is_pinned;
            return (
              <div key={slide.id} className="space-y-1">
                <button
                  onClick={() => handleSlide(slide.id, true)}
                  disabled={loading === slide.id}
                  className={`w-full rounded-xl px-4 py-4 text-left transition-all ring-1 ${
                    isPinned
                      ? 'bg-brand-600/20 ring-brand-500 text-brand-300'
                      : isActive
                      ? 'bg-surface-card ring-slate-500 text-white'
                      : 'bg-surface-card ring-surface-border text-slate-400 hover:ring-slate-500 hover:text-slate-300'
                  } disabled:opacity-50`}
                >
                  <p className="text-2xl mb-1">{slide.icon}</p>
                  <p className="text-xs font-semibold">{slide.label}</p>
                  {isPinned && <p className="text-[10px] text-brand-400 mt-0.5">Pinned</p>}
                </button>
                {isActive && isPinned && (
                  <button
                    onClick={() => handleSlide(slide.id, false)}
                    className="w-full rounded-lg border border-slate-700 py-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Unpin (resume rotation)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Announcement sender */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Send announcement
        </h2>
        <div className="rounded-xl bg-surface-card ring-1 ring-surface-border p-5 space-y-4">
          <div>
            <textarea
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value.slice(0, 200))}
              placeholder="Type your announcement (max 200 chars)…"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none resize-none"
            />
            <p className="mt-1 text-right text-xs text-slate-600">{annMessage.length}/200</p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">Urgency:</label>
              <button
                onClick={() => setAnnUrgency('normal')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  annUrgency === 'normal'
                    ? 'bg-brand-600/20 text-brand-300 ring-1 ring-brand-500'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setAnnUrgency('urgent')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  annUrgency === 'urgent'
                    ? 'bg-red-900/40 text-red-400 ring-1 ring-red-600'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                ⚠ Urgent
              </button>
            </div>

            <button
              onClick={handleSendAnnouncement}
              disabled={sendingAnn || !annMessage.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {sendingAnn ? 'Sending…' : '📢 Send & display'}
            </button>
          </div>
        </div>
      </div>

      {/* Active announcements */}
      {announcements.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Active announcements
          </h2>
          <div className="space-y-2">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`flex items-start justify-between gap-4 rounded-xl px-5 py-4 ring-1 ${
                  ann.urgency === 'urgent'
                    ? 'bg-red-950/40 ring-red-800'
                    : 'bg-surface-card ring-surface-border'
                }`}
              >
                <div className="min-w-0 flex-1">
                  {ann.urgency === 'urgent' && (
                    <span className="mb-1 inline-block rounded-full bg-red-900/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                      Urgent
                    </span>
                  )}
                  <p className="text-sm text-white">{ann.message}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {new Date(ann.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(ann.id)}
                  disabled={loading === ann.id}
                  className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-red-600 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {loading === ann.id ? '…' : 'Dismiss'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
