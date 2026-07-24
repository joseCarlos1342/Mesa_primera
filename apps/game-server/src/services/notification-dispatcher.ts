import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { OneSignalDeliveryError, sendOneSignalPush } from './onesignal';

type OutboxRow = {
  id: string;
  notification_id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  attempts: number;
  claim_token: string;
};

type DispatcherClient = SupabaseClient;

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 5_000;

function createDispatcherClient(): DispatcherClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function retryDelay(attempts: number): string {
  const seconds = Math.min(60 * 30, 2 ** Math.max(0, attempts - 1) * 10);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function updateClaimedOutbox(
  client: DispatcherClient,
  row: OutboxRow,
  values: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await client
    .from('notification_outbox')
    .update(values)
    .eq('id', row.id)
    .eq('status', 'processing')
    .eq('claim_token', row.claim_token)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function dispatchPendingNotifications(
  client: DispatcherClient | null = createDispatcherClient(),
  limit = 50,
): Promise<number> {
  if (!client) return 0;

  const { data: rows, error } = await client.rpc('claim_notification_outbox', { p_limit: limit });
  if (error) throw error;

  let processed = 0;
  for (const row of (rows ?? []) as OutboxRow[]) {
    try {
      await client
        .from('broadcast_deliveries')
        .update({ push_queued_at: new Date().toISOString() })
        .eq('notification_id', row.notification_id);

      const providerMessageId = await sendOneSignalPush(row.user_id, {
        title: row.title,
        body: row.body,
        data: row.data,
      }, row.id);

      const claimed = await updateClaimedOutbox(client, row, {
          status: 'accepted',
          provider_message_id: providerMessageId,
          accepted_at: new Date().toISOString(),
          last_error: null,
      });
      if (!claimed) throw new Error('Notification claim was lost before acknowledgement');

      await client
        .from('broadcast_deliveries')
        .update({ push_sent_at: new Date().toISOString(), push_error: null })
        .eq('notification_id', row.notification_id);
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification delivery error';
      const terminal = row.attempts >= MAX_ATTEMPTS
        || (error instanceof OneSignalDeliveryError && !error.retryable);
      const claimed = await updateClaimedOutbox(client, row, {
          status: terminal ? 'failed' : 'pending',
          available_at: terminal ? new Date().toISOString() : retryDelay(row.attempts),
          failed_at: terminal ? new Date().toISOString() : null,
          last_error: message.slice(0, 1000),
      });

      if (claimed) {
        await client
          .from('broadcast_deliveries')
          .update({
            push_failed_at: terminal ? new Date().toISOString() : null,
            push_error: message.slice(0, 1000),
          })
          .eq('notification_id', row.notification_id);
      }
    }
  }

  return processed;
}

export function startNotificationDispatcher(): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await dispatchPendingNotifications();
    } catch (error) {
      console.error('[NotificationDispatcher] poll failed:', error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
