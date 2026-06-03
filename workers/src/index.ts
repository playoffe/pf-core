/**
 * @pickleball/workers — Social media posting pipeline
 *
 * Entry point for the ECS Fargate worker service.
 * Starts three BullMQ workers consuming from Redis (local / ElastiCache):
 *
 *   social:graphic  → renders graphic + uploads to Supabase Storage
 *   social:post     → calls platform APIs (Instagram / Facebook / X)
 *   social:podium   → renders organiser podium / wrap-up graphics
 *
 * Dev:  pnpm dev     (tsx watch, auto-restarts on file change)
 * Prod: pnpm start   (node dist/index.js)
 */

import 'dotenv/config';
import { startGraphicWorker } from './workers/graphic.worker.js';
import { startPostWorker }    from './workers/post.worker.js';
import { startPodiumWorker }  from './workers/podium.worker.js';
import { connection }         from './queue.js';

async function main() {
  console.log('='.repeat(60));
  console.log('  @pickleball/workers  |  Social media pipeline');
  console.log('='.repeat(60));
  console.log(`  Redis: ${process.env.REDIS_URL ?? 'redis://localhost:6379'}`);
  console.log(`  Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'}`);
  console.log('='.repeat(60));

  // Verify Redis connection
  await connection.ping();
  console.log('  ✓ Redis connected');

  // Start all workers
  const graphicWorker = startGraphicWorker();
  const postWorker    = startPostWorker();
  const podiumWorker  = startPodiumWorker();

  console.log('\n  All workers running. Waiting for jobs...\n');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[workers] ${signal} received — shutting down gracefully…`);
    await Promise.all([
      graphicWorker.close(),
      postWorker.close(),
      podiumWorker.close(),
    ]);
    await connection.quit();
    console.log('[workers] Shut down cleanly.');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[workers] Fatal startup error:', err);
  process.exit(1);
});
