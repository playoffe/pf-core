'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateDrawAction, clearDrawAction, generateNextSwissRoundAction, promoteGroupWinnersAction } from '@/lib/actions/draws';
import type { MatchWithPlayers } from '@/lib/actions/draws';
import { BracketView } from './BracketView';
import { useRealtimeCategoryMatches } from '@/hooks/useRealtimeCategoryMatches';
import { StandingsTable } from './StandingsTable';

interface Props {
  categoryId: string;
  tournamentSlug: string;
  drawFormat: string;
  categoryStatus: string;
  entryCount: number;
  initialMatches: MatchWithPlayers[];
  showBracket?: boolean;   // when false, hides BracketView (default true)
  showStandings?: boolean; // when false, hides StandingsTable (default true)
  readOnly?: boolean;      // when true, match tiles in BracketView are non-clickable
}

const FORMAT_LABEL: Record<string, string> = {
  round_robin: 'Round robin',
  single_elimination: 'Single elimination',
  double_elimination: 'Double elimination',
  group_stage_knockout: 'Group stage + knockout',
  swiss: 'Swiss',
};

export function DrawSection({
  categoryId,
  tournamentSlug,
  drawFormat,
  categoryStatus,
  entryCount,
  initialMatches,
  showBracket = true,
  showStandings = true,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingSwissRound, setGeneratingSwissRound] = useState(false);
  const [promotingGroups, setPromotingGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [matches, setMatches] = useState(initialMatches);

  // Sync matches when server re-renders after router.refresh() passes new initialMatches
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  const isDrawn = categoryStatus === 'draw_generated' || categoryStatus === 'in_progress' || categoryStatus === 'completed';

  // Swiss next-round logic
  const isSwiss = drawFormat === 'swiss';
  const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  const currentRoundComplete =
    maxRound > 0 &&
    matches
      .filter((m) => m.round === maxRound)
      .every((m) => m.status === 'completed' || m.status === 'walkover');
  const totalSwissRounds = Math.ceil(Math.log2(Math.max(entryCount, 2)));
  const canGenerateNextSwissRound =
    isSwiss && isDrawn && currentRoundComplete && maxRound < totalSwissRounds;

  // Group stage knockout: can promote when all group matches are done and knockouts unfilled
  const isGroupKnockout = drawFormat === 'group_stage_knockout';
  const groupMatches = matches.filter((m) => m.group_name !== null);
  const knockoutMatches = matches.filter((m) => m.group_name === null);
  const allGroupMatchesDone =
    groupMatches.length > 0 &&
    groupMatches.every((m) => m.status === 'completed' || m.status === 'walkover');
  const knockoutSlotsEmpty = knockoutMatches.some((m) => !m.entry_a && !m.entry_b);
  const canPromoteGroups = isGroupKnockout && isDrawn && allGroupMatchesDone && knockoutSlotsEmpty;

  async function handlePromoteGroups() {
    setPromotingGroups(true);
    setError(null);
    const result = await promoteGroupWinnersAction(categoryId);
    if ('error' in result && result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setPromotingGroups(false);
  }

  // Live subscription — auto-refreshes bracket when any match in this category changes
  const liveStatus = useRealtimeCategoryMatches(categoryId);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const result = await generateDrawAction(categoryId);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  async function handleClear() {
    setShowRegenConfirm(false);
    setLoading(true);
    setError(null);
    await clearDrawAction(categoryId);
    setMatches([]);
    router.refresh();
    setLoading(false);
  }

  async function handleGenerateNextSwissRound() {
    setGeneratingSwissRound(true);
    setError(null);
    const result = await generateNextSwissRoundAction(categoryId);
    if ('error' in result && result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setGeneratingSwissRound(false);
  }

  return (
    <section>
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Draw</h2>
            {/* Live indicator — only meaningful once a draw exists */}
            {isDrawn && (
              <span
                title={
                  liveStatus === 'live'
                    ? 'Live — updates automatically'
                    : liveStatus === 'connecting' || liveStatus === 'reconnecting'
                      ? 'Connecting…'
                      : 'Offline — reload to reconnect'
                }
                className={`h-1.5 w-1.5 rounded-full ${
                  liveStatus === 'live'
                    ? 'bg-accent-400 animate-pulse'
                    : liveStatus === 'connecting' || liveStatus === 'reconnecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}
              />
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600">{FORMAT_LABEL[drawFormat] ?? drawFormat}</p>
          {readOnly && isDrawn && (
            <p className="mt-1 text-xs text-slate-500">
              To assign referees and start scoring, use the{' '}
              <span className="text-slate-400 font-medium">🎾 Scoring</span> button above.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isDrawn ? (
            <>
              {/* Match count chip */}
              <span className="rounded-full bg-surface-card px-3 py-1 text-xs text-slate-400 ring-1 ring-surface-border">
                {matches.length} match{matches.length !== 1 ? 'es' : ''}
              </span>

              {/* Link to schedule page */}
              {!showRegenConfirm && (
                <Link
                  href={`/tournaments/${tournamentSlug}/schedule`}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-brand-500 hover:text-brand-400 transition-colors"
                >
                  📅 Schedule
                </Link>
              )}

              {/* Swiss: generate next round */}
              {canGenerateNextSwissRound && !showRegenConfirm && (
                <button
                  onClick={handleGenerateNextSwissRound}
                  disabled={generatingSwissRound}
                  className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs text-brand-400 hover:bg-brand-600/10 transition-colors disabled:opacity-50"
                >
                  {generatingSwissRound ? 'Generating…' : `Generate Round ${maxRound + 1}`}
                </button>
              )}

              {/* Group stage knockout: promote group winners to knockout bracket */}
              {canPromoteGroups && !showRegenConfirm && (
                <button
                  onClick={handlePromoteGroups}
                  disabled={promotingGroups}
                  className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs text-brand-400 hover:bg-brand-600/10 transition-colors disabled:opacity-50"
                >
                  {promotingGroups ? 'Promoting…' : 'Promote group winners →'}
                </button>
              )}

              {categoryStatus === 'draw_generated' && !showRegenConfirm && (
                <button
                  onClick={() => setShowRegenConfirm(true)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-red-600 hover:text-red-400 transition-colors"
                >
                  Regenerate
                </button>
              )}

              {showRegenConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Delete existing draw?</span>
                  <button
                    onClick={handleClear}
                    disabled={loading}
                    className="rounded-lg bg-red-900/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                  >
                    {loading ? '…' : 'Yes, regenerate'}
                  </button>
                  <button
                    onClick={() => setShowRegenConfirm(false)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading || entryCount < 2}
              title={entryCount < 2 ? 'Need at least 2 entries' : undefined}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate draw'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Draw not yet generated */}
      {!isDrawn && !loading && (
        <div className="rounded-xl bg-surface-card p-8 text-center ring-1 ring-surface-border">
          <p className="text-2xl mb-2">🎯</p>
          <p className="text-sm font-medium text-white mb-1">Draw not generated yet</p>
          <p className="text-xs text-slate-500">
            {entryCount < 2
              ? 'Add at least 2 entries before generating a draw.'
              : `${entryCount} entr${entryCount === 1 ? 'y' : 'ies'} ready · click Generate draw to create the bracket`}
          </p>
        </div>
      )}

      {/* Bracket / schedule */}
      {showBracket && isDrawn && matches.length > 0 && (
        <BracketView matches={matches} format={drawFormat} tournamentSlug={tournamentSlug} readOnly={readOnly} />
      )}

      {/* Live standings — round-robin, swiss, group stage */}
      {showStandings && isDrawn && matches.length > 0 && (
        <StandingsTable matches={matches} format={drawFormat} />
      )}
    </section>
  );
}
