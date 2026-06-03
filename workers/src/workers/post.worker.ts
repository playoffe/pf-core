// Post Worker — processes social:post queue jobs.
//
// For each job:
//  1. Update post_log status → 'posting'
//  2. For X: download the graphic PNG (X requires re-uploading media to their CDN)
//  3. Call the platform client (Instagram / Facebook / X)
//  4. Update post_log with result (status = 'posted' | 'failed', platform_post_id)

import { Worker } from 'bullmq';
import { connection, QUEUE_NAMES } from '../queue.js';
import type { PostJobData } from '../queue.js';
import { supabase } from '../lib/supabase.js';
import { postToPlatform } from '../platforms/index.js';

const CONCURRENCY = parseInt(process.env.POST_WORKER_CONCURRENCY ?? '10', 10);

export function startPostWorker() {
  const worker = new Worker<PostJobData>(
    QUEUE_NAMES.POST,
    async (job) => {
      const { postLogId, playerId, platform, graphicUrl, caption } = job.data;
      console.log(`[post] Processing job ${job.id}: ${platform} for log ${postLogId}`);

      // Mark as 'posting'
      await supabase
        .from('social_post_log' as 'social_post_log')
        .update({ status: 'posting' })
        .eq('id', postLogId);

      // For X, download the PNG buffer so we can re-upload to Twitter's CDN
      let imageBuffer: Buffer | undefined;
      if (platform === 'x') {
        try {
          const res = await fetch(graphicUrl);
          if (!res.ok) throw new Error(`Failed to fetch graphic: ${res.statusText}`);
          imageBuffer = Buffer.from(await res.arrayBuffer());
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await markFailed(postLogId, `Image download failed: ${msg}`);
          return { success: false };
        }
      }

      // Post to platform
      const result = await postToPlatform({
        platform,
        playerId,
        graphicUrl,
        imageBuffer,
        caption,
      });

      if (result.success) {
        await supabase
          .from('social_post_log' as 'social_post_log')
          .update({
            status: 'posted',
            platform_post_id: result.platformPostId,
            posted_at: new Date().toISOString(),
          })
          .eq('id', postLogId);
        console.log(`[post] Job ${job.id}: ✓ posted to ${platform}, id=${result.platformPostId}`);
        return { success: true, platformPostId: result.platformPostId };
      } else {
        await markFailed(postLogId, result.error ?? 'Unknown error');
        console.error(`[post] Job ${job.id}: ✗ failed on ${platform}: ${result.error}`);
        // Throw so BullMQ can apply retry policy (3 attempts with exponential backoff)
        throw new Error(result.error ?? 'Platform post failed');
      }
    },
    { connection, concurrency: CONCURRENCY },
  );

  worker.on('failed', (job, err) => {
    // On final failure (all retries exhausted), mark as failed in the log
    if (job?.data?.postLogId) {
      void markFailed(job.data.postLogId, err.message);
    }
    console.error(`[post] Job ${job?.id} permanently failed:`, err.message);
  });

  console.log(`[post] Worker started (concurrency ${CONCURRENCY})`);
  return worker;
}

async function markFailed(postLogId: string, errorMessage: string) {
  await supabase
    .from('social_post_log' as 'social_post_log')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('id', postLogId);
}
