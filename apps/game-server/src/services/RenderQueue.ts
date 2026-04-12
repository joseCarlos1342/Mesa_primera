import { Queue } from 'bullmq';
import type { RenderJobData } from '../types/render';

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const QUEUE_NAME = 'mp4-render';

const queue = new Queue(QUEUE_NAME, { connection: redisOptions });

queue.on('error', (err) => {
  console.warn('[Redis Silenced - RenderQueue]:', err.message);
});

export class RenderQueue {
  static readonly QUEUE_NAME = QUEUE_NAME;

  /**
   * Encola un trabajo de renderizado de MP4.
   * Usa jobId deduplicado para evitar renders duplicados del mismo gameId.
   */
  static async enqueue(data: RenderJobData) {
    return queue.add('render-mp4', data, {
      jobId: `render-${data.gameId}`,
      attempts: 2,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: true,
      removeOnFail: { age: 7 * 24 * 3600 },
    });
  }
}
