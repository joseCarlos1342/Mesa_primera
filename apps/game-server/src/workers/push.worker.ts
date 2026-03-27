import { Worker, Job } from 'bullmq';
import { sendWebPush } from '../services/push-notifications';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Use service_role in prod

let supabase: any = null;
if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    if (process.env.NODE_ENV === 'development') return null; // stop retrying in dev if no redis
    return Math.min(times * 50, 2000);
  }
};

export const pushWorker = new Worker('push-notifications', async (job: Job) => {
  const { userId, payload } = job.data;
  
  if (!supabaseKey) {
      console.warn('[PushWorker] No Supabase key found to query subscriptions');
      return;
  }
  
  // Fetch subscriptions from Supabase
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error || (!subscriptions || subscriptions.length === 0)) {
    console.log(`[PushWorker] No subscriptions found for user ${userId}`);
    return;
  }

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      }
    };

    await sendWebPush(pushSubscription, payload);
  }
}, { connection });

pushWorker.on('completed', job => {
  console.log(`[PushWorker] Job ${job.id} completed for userId: ${job.data?.userId}`);
});

let lastRedisError = '';
pushWorker.on('error', (err) => {
  if (err.message === lastRedisError) return;
  lastRedisError = err.message;
  
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Redis Silenced - PushWorker]:', err.message);
  } else {
    console.error('[PushWorker] Redis Error:', err);
  }
});

pushWorker.on('failed', (job, err) => {
  console.error(`[PushWorker] Job ${job?.id} failed:`, err);
});
