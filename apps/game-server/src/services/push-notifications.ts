import webpush from 'web-push';
import { Queue } from 'bullmq';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

if (publicVapidKey && privateVapidKey && subject) {
  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
}

/** Legacy delivery kept only for controlled rollback; OneSignal is primary. */
export async function sendWebPush(subscription: webpush.PushSubscription, payload: unknown) {
  try {
    if (!publicVapidKey || !privateVapidKey || !subject) {
      throw new Error('Legacy Web Push is disabled; configure OneSignal for push delivery');
    }
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

export const pushQueue = new Queue('push-notifications', {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      if (process.env.NODE_ENV === 'development') return null;
      return Math.min(times * 50, 2000);
    },
  },
});

export async function enqueuePushNotification(userId: string, payload: unknown) {
  await pushQueue.add('send-push', { userId, payload });
}
