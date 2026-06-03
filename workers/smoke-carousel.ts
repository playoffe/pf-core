import 'dotenv/config';
import { getPodiumQueue } from '../apps/web/src/lib/social-queue.js';
// Can't import from web app in workers context - use the workers queue directly
import { podiumQueue } from './src/queue.js';

const job = await podiumQueue.add('carousel-smoke-test', {
  type: 'draw_published',
  tournamentId: 'ba000001-0000-0000-0000-000000000001',
  clubId:       'c1000000-0000-0000-0000-000000000001',
  categoryId:   'b1000000-0000-0000-0000-000000000001',
  categoryName: "Men's Doubles Open",
  drawFormat:   'group_stage_knockout',
  participantCount: 32,
}, { jobId: 'carousel-smoke-test-1' });

console.log('Carousel test job queued:', job.id);
await podiumQueue.close();
