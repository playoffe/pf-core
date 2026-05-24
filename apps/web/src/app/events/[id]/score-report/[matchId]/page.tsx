import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMatchForReportAction } from '@/lib/actions/player-reporting';
import { PlayerReportForm } from '@/components/scoring/PlayerReportForm';

export const metadata: Metadata = { title: 'Report Match Score' };

interface Props {
  params: Promise<{ id: string; matchId: string }>;
}

export default async function ScoreReportPage({ params }: Props) {
  const { matchId } = await params;

  const result = await getMatchForReportAction(matchId);

  if ('error' in result || !result.match) {
    notFound();
  }

  const { match } = result;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">
            PLAY<span className="text-white">OFFE</span>
          </p>
          <h1 className="text-2xl font-bold text-white mb-1">Report match score</h1>
          <p className="text-sm text-slate-500">
            {match.tournament_name}
            {match.category_name ? ` · ${match.category_name}` : ''}
            {match.round_name ? ` · ${match.round_name}` : ''}
          </p>
        </div>

        {match.status === 'completed' || match.status === 'walkover' ? (
          <div className="rounded-xl bg-surface-card ring-1 ring-surface-border p-8 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-lg font-semibold text-white mb-2">Match already scored</p>
            <p className="text-sm text-slate-500">
              This match has been officially scored by the tournament organiser.
            </p>
          </div>
        ) : match.player_reported_winner_id ? (
          <div className="rounded-xl bg-surface-card ring-1 ring-surface-border p-8 text-center">
            <p className="text-3xl mb-3">⏳</p>
            <p className="text-lg font-semibold text-white mb-2">Score submitted — pending review</p>
            <p className="text-sm text-slate-500">
              Your score has been submitted and is waiting for the tournament organiser to confirm.
            </p>
          </div>
        ) : (
          <PlayerReportForm match={match} />
        )}
      </div>
    </div>
  );
}
