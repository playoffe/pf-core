// Podium Worker — processes social:podium queue jobs.
// Renders organiser posting graphics: per-category podium and full-tournament wrap-up.
//
// Phase 11B: implements the rendering + upload pipeline.
// TODO: Fetch organiser's club social connections and post to club pages.

import { Worker } from 'bullmq';
import { connection, QUEUE_NAMES } from '../queue.js';
import type { PodiumJobData } from '../queue.js';
import { supabase, uploadGraphic } from '../lib/supabase.js';
import { renderPodium } from '../lib/graphic.js';

const CONCURRENCY = parseInt(process.env.PODIUM_WORKER_CONCURRENCY ?? '2', 10);

export function startPodiumWorker() {
  const worker = new Worker<PodiumJobData>(
    QUEUE_NAMES.PODIUM,
    async (job) => {
      const { type, categoryId, tournamentId, clubId } = job.data;
      console.log(`[podium] Processing job ${job.id}: ${type} for tournament ${tournamentId}`);

      // Fetch tournament
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', tournamentId)
        .maybeSingle();
      const tournamentName = (tournament as { name: string } | null)?.name ?? 'Tournament';

      // Fetch category + podium entries
      let categoryName: string | undefined;
      let winnerName = '';
      let runnerUpName: string | undefined;
      let thirdPlaceName: string | undefined;

      if (type === 'podium' && categoryId) {
        const { data: cat } = await supabase
          .from('tournament_categories')
          .select('name, winner_entry_id, runner_up_entry_id, third_place_entry_id')
          .eq('id', categoryId)
          .maybeSingle();

        if (cat) {
          const c = cat as {
            name: string;
            winner_entry_id?: string | null;
            runner_up_entry_id?: string | null;
            third_place_entry_id?: string | null;
          };
          categoryName = c.name;

          const entryIds = [c.winner_entry_id, c.runner_up_entry_id, c.third_place_entry_id]
            .filter(Boolean) as string[];

          if (entryIds.length > 0) {
            const { data: entries } = await supabase
              .from('tournament_entries')
              .select('id, player_id')
              .in('id', entryIds);

            const playerIdByEntry = new Map(
              (entries ?? []).map((e) => [(e as { id: string; player_id: string }).id, (e as { id: string; player_id: string }).player_id]),
            );

            const playerIds = [...playerIdByEntry.values()];
            const { data: players } = await supabase
              .from('players')
              .select('id, full_name')
              .in('id', playerIds);

            const nameById = new Map(
              (players ?? []).map((p) => [(p as { id: string; full_name: string }).id, (p as { id: string; full_name: string }).full_name]),
            );

            if (c.winner_entry_id) {
              const pid = playerIdByEntry.get(c.winner_entry_id);
              winnerName = (pid ? nameById.get(pid) : undefined) ?? 'Winner';
            }
            if (c.runner_up_entry_id) {
              const pid = playerIdByEntry.get(c.runner_up_entry_id);
              runnerUpName = pid ? nameById.get(pid) : undefined;
            }
            if (c.third_place_entry_id) {
              const pid = playerIdByEntry.get(c.third_place_entry_id);
              thirdPlaceName = pid ? nameById.get(pid) : undefined;
            }
          }
        }
      }

      if (!winnerName) {
        console.warn(`[podium] Job ${job.id}: no winner data — skipping graphic`);
        return { skipped: true };
      }

      // Render graphic
      const pngBuffer = await renderPodium({
        type,
        tournamentName,
        categoryName,
        winnerName,
        runnerUpName,
        thirdPlaceName,
        platform: 'generic',
      });

      // Upload
      const fileName = `organiser/${clubId}/${type}-${categoryId ?? tournamentId}-${Date.now()}.png`;
      const graphicUrl = await uploadGraphic(fileName, pngBuffer);
      console.log(`[podium] Job ${job.id}: graphic uploaded → ${graphicUrl}`);

      // TODO: Fetch club social connections and enqueue post jobs for each platform
      // For Phase 11B this is logged but not yet posted — club social OAuth is Phase 11C scope
      console.log(`[podium] Job ${job.id}: graphic ready for organiser review at ${graphicUrl}`);

      return { done: true, graphicUrl };
    },
    { connection, concurrency: CONCURRENCY },
  );

  worker.on('failed', (job, err) => {
    console.error(`[podium] Job ${job?.id} failed:`, err.message);
  });

  console.log(`[podium] Worker started (concurrency ${CONCURRENCY})`);
  return worker;
}
