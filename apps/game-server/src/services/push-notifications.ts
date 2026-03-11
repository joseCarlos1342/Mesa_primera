import webpush from 'web-push';
import { Queue } from 'bullmq';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BDlJyOfR-BkVxllTo-h3emcyKR1SnwqF2CP4i8JwUxsgybVVoAkumnb4ublpiptS398NaIgWdO6G10Ae0eJ64l4';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '0TSSBVAGwaKmAKsNCX3Nibl7bptIv2A9Sn9Iqfj7IAo';
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@mesaprimera.com';

webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);

export async function sendWebPush(subscription: webpush.PushSubscription, payload: any) {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return true;
    } catch (error) {
        console.error('Error sending push notification:', error);
        return false;
    }
}

// Queue for scheduling push notifications
export const pushQueue = new Queue('push-notifications', {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  }
});

export async function enqueuePushNotification(userId: string, payload: any) {
    await pushQueue.add('send-push', { userId, payload });
}
