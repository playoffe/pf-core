// Graphic Worker — processes social:graphic queue jobs.
//
// For each job:
//  1. Fetch match / category / tournament data from Supabase
//  2. Determine which platforms the player has enabled for this trigger
//  3. Generate caption (template or Claude AI)
//  4. Render graphic with Satori + @resvg/resvg-js
//  5. Upload PNG to Supabase Storage
//  6. For each platform:
//     a. Insert a row into social_post_log (status = 'pending_preview' | 'posting')
//     b. If preview_before_post → stop here (user must approve from app)
//     c. Otherwise → enqueue a social:post job

import { Worker } from 'bullmq';
import { connection, QUEUE_NAMES, postQueue } from '../queue.js';
import type { GraphicJobData, PostJobData } from '../queue.js';
import { supabase, uploadGraphic } from '../lib/supabase.js';
import { renderMatchWin, renderCategoryComplete } from '../lib/graphic.js';
import { generateCaption } from '../lib/caption.js';
import type { CaptionStyle } from '../lib/caption.js';
import type { CaptionContext } from '../lib/caption.js';

const CONCURRENCY = parseInt(process.env.GRAPHIC_WORKER_CONCURRENCY ?? '5', 10);

export function startGraphicWorker() {
  const worker = new Worker<GraphicJobData>(
    QUEUE_NAMES.GRAPHIC,
    async (job) => {
      const { triggerType, playerId, matchId, categoryId, tournamentId } = job.data;
      console.log(`[graphic] Processing job ${job.id}: ${triggerType} for player ${playerId}`);

      // ── 1. Fetch player social config ────────────────────────────────────────
      const [{ data: connections }, { data: profile }] = await Promise.all([
        supabase
          .from('social_connections' as 'social_connections')
          .select('platform, is_active')
          .eq('player_id', playerId)
          .eq('is_active', true),
        supabase
          .from('player_profiles')
          .select('social_post_prefs, full_name')
          .eq('player_id', playerId)
          .maybeSingle(),
      ]);

      const prefs = (profile as { social_post_prefs?: Record<string, unknown>; full_name?: string } | null)
        ?.social_post_prefs as {
          paused?: boolean;
          platforms?: Record<string, {
            enabled?: boolean;
            triggers?: Record<string, boolean>;
            caption_style?: string;
            custom_template?: string;
            preview_before_post?: boolean;
          }>;
        } | undefined;

      if (!prefs || prefs.paused) {
        console.log(`[graphic] Job ${job.id}: social posting paused or no prefs — skipping`);
        return { skipped: true };
      }

      const connectedPlatforms = new Set((connections ?? []).map((c) => (c as { platform: string }).platform));

      // Determine which platforms are active for this trigger
      const platformsToPost = Object.entries(prefs.platforms ?? {})
        .filter(([platform, cfg]) => {
          if (!cfg.enabled) return false;
          if (!(cfg.triggers ?? {})[triggerType]) return false;
          if (platform !== 'whatsapp' && !connectedPlatforms.has(platform)) return false;
          return true;
        })
        .map(([platform, cfg]) => ({ platform, cfg }));

      if (platformsToPost.length === 0) {
        console.log(`[graphic] Job ${job.id}: no platforms enabled for ${triggerType} — skipping`);
        return { skipped: true };
      }

      // ── 2. Fetch render data ─────────────────────────────────────────────────
      const ctx = await fetchRenderContext({ triggerType, matchId, categoryId, tournamentId, playerId });
      if (!ctx) {
        console.error(`[graphic] Job ${job.id}: could not build render context`);
        return { error: 'Missing render context' };
      }

      // ── 3. Render graphic ────────────────────────────────────────────────────
      let pngBuffer: Buffer;
      try {
        pngBuffer = triggerType === 'match_win'
          ? await renderMatchWin({
              playerName:    ctx.playerName,
              opponentName:  ctx.opponentName ?? 'Opponent',
              score:         ctx.score ?? '',
              tournamentName: ctx.tournamentName,
              categoryName:  ctx.categoryName,
              platform:      'generic',
            })
          : await renderCategoryComplete({ ...ctx, platform: 'generic' });
      } catch (err) {
        console.error(`[graphic] Job ${job.id}: render failed:`, err);
        throw err; // BullMQ will retry
      }

      // ── 4. Upload to Supabase Storage ────────────────────────────────────────
      const fileName = `${playerId}/${triggerType}-${Date.now()}.png`;
      let graphicUrl: string;
      try {
        graphicUrl = await uploadGraphic(fileName, pngBuffer);
        console.log(`[graphic] Job ${job.id}: uploaded → ${graphicUrl}`);
      } catch (err) {
        console.error(`[graphic] Job ${job.id}: upload failed:`, err);
        throw err;
      }

      // ── 5. Per-platform: generate caption, create log row, optionally enqueue post ──
      const captionCtx: CaptionContext = {
        triggerType,
        playerName: ctx.playerName,
        opponentName: ctx.opponentName,
        score: ctx.score,
        tournamentName: ctx.tournamentName,
        categoryName: ctx.categoryName,
      };

      for (const { platform, cfg } of platformsToPost) {
        if (platform === 'whatsapp') continue; // share-link only — no server-side post

        const captionStyle = (cfg.caption_style ?? 'humble') as CaptionStyle;
        let caption: string;
        try {
          caption = await generateCaption(captionStyle, {
            ...captionCtx,
            ...(captionStyle === 'custom' && cfg.custom_template
              ? { customTemplate: cfg.custom_template }
              : {}),
          });
        } catch {
          caption = `${triggerType === 'match_win' ? '🏆 Match win' : '🎯 Category complete'} at ${ctx.tournamentName}! #pickleball`;
        }

        const isPreview = cfg.preview_before_post ?? true;
        const initialStatus = isPreview ? 'pending_preview' : 'posting';

        // Insert post log row
        const { data: logRow } = await supabase
          .from('social_post_log' as 'social_post_log')
          .insert({
            player_id: playerId,
            platform,
            trigger_type: triggerType,
            trigger_id: matchId ?? categoryId ?? tournamentId,
            tournament_id: tournamentId,
            caption,
            caption_style: captionStyle,
            graphic_url: graphicUrl,
            status: initialStatus,
            generated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (!logRow) continue;
        const postLogId = (logRow as { id: string }).id;

        if (isPreview) {
          // TODO: send preview push notification via web-push / SNS
          console.log(`[graphic] Job ${job.id}: preview pending for ${platform}, log ${postLogId}`);
        } else {
          // Enqueue post job immediately
          const postJobData: PostJobData = {
            postLogId,
            playerId,
            platform: platform as 'instagram' | 'facebook' | 'x',
            graphicUrl,
            caption,
            triggerType,
          };
          await postQueue.add(`${platform}-${postLogId}`, postJobData, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          });
          console.log(`[graphic] Job ${job.id}: post job enqueued for ${platform}`);
        }
      }

      return { done: true, platforms: platformsToPost.length };
    },
    { connection, concurrency: CONCURRENCY },
  );

  worker.on('failed', (job, err) => {
    console.error(`[graphic] Job ${job?.id} failed:`, err.message);
  });

  console.log(`[graphic] Worker started (concurrency ${CONCURRENCY})`);
  return worker;
}

// ── Render context builder ────────────────────────────────────────────────────

interface RenderContext {
  playerName: string;
  opponentName?: string;
  score?: string;
  tournamentName: string;
  categoryName: string;
  position?: number;
}

async function fetchRenderContext(params: {
  triggerType: string;
  matchId?: string;
  categoryId: string;
  tournamentId: string;
  playerId: string;
}): Promise<RenderContext | null> {
  const { triggerType, matchId, categoryId, tournamentId, playerId } = params;

  // Fetch tournament + category names
  const [{ data: tournament }, { data: category }] = await Promise.all([
    supabase.from('tournaments').select('name').eq('id', tournamentId).maybeSingle(),
    supabase.from('tournament_categories').select('name').eq('id', categoryId).maybeSingle(),
  ]);

  const tournamentName = (tournament as { name: string } | null)?.name ?? 'Tournament';
  const categoryName   = (category as { name: string } | null)?.name ?? 'Category';

  // Fetch player name
  const { data: player } = await supabase
    .from('players')
    .select('full_name')
    .eq('id', playerId)
    .maybeSingle();
  const playerName = (player as { full_name: string } | null)?.full_name ?? 'Player';

  if (triggerType === 'match_win' && matchId) {
    // Fetch match for score + opponent info
    const { data: match } = await supabase
      .from('matches')
      .select('sets, entry_a_id, entry_b_id, winner_entry_id')
      .eq('id', matchId)
      .maybeSingle();

    if (!match) return { playerName, tournamentName, categoryName };

    const m = match as { sets: unknown; entry_a_id: string; entry_b_id: string; winner_entry_id: string };
    const opponentEntryId = m.winner_entry_id === m.entry_a_id ? m.entry_b_id : m.entry_a_id;

    const { data: opponentEntry } = await supabase
      .from('tournament_entries')
      .select('player_id')
      .eq('id', opponentEntryId)
      .maybeSingle();

    let opponentName = 'Opponent';
    if (opponentEntry) {
      const { data: op } = await supabase
        .from('players')
        .select('full_name')
        .eq('id', (opponentEntry as { player_id: string }).player_id)
        .maybeSingle();
      opponentName = (op as { full_name: string } | null)?.full_name ?? 'Opponent';
    }

    // Format score from sets JSONB: [{ score_a: 11, score_b: 7 }, ...]
    const sets = Array.isArray(m.sets) ? m.sets as { score_a: number; score_b: number }[] : [];
    const score = sets.map((s) => `${s.score_a}-${s.score_b}`).join(', ');

    return { playerName, opponentName, score, tournamentName, categoryName };
  }

  return { playerName, tournamentName, categoryName };
}
