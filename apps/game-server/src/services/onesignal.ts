type OneSignalNotification = {
  id?: string;
  errors?: unknown;
};

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
};

export class OneSignalDeliveryError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'OneSignalDeliveryError';
    this.retryable = retryable;
  }
}

const ONE_SIGNAL_API_URL = 'https://api.onesignal.com/notifications';

function internalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

function getOneSignalConfig() {
  const appId = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (process.env.ONESIGNAL_APP_ID && process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    && process.env.ONESIGNAL_APP_ID !== process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
    throw new OneSignalDeliveryError('OneSignal app IDs do not match between server and web configuration', false);
  }

  if (!appId || !apiKey) {
    throw new OneSignalDeliveryError('OneSignal is not configured: ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY are required', false);
  }

  return { appId, apiKey };
}

export async function sendOneSignalPush(userId: string, payload: PushPayload, idempotencyKey?: string): Promise<string> {
  const { appId, apiKey } = getOneSignalConfig();
  const safeUrl = internalUrl(payload.data?.url);
  const safeData = payload.data
    ? Object.fromEntries(Object.entries(payload.data).filter(([key, value]) => key !== 'url' || safeUrl === value))
    : undefined;
  let response: Response;
  try {
    response = await fetch(ONE_SIGNAL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        app_id: appId,
        target_channel: 'push',
        include_aliases: { external_id: [userId] },
        headings: { en: payload.title, es: payload.title },
        contents: { en: payload.body, es: payload.body },
        data: safeData,
        url: safeUrl,
        idempotency_key: idempotencyKey,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    throw new OneSignalDeliveryError(`OneSignal request failed: ${message}`, true);
  }

  const responseBody = (await response.json().catch(() => ({}))) as OneSignalNotification;
  if (!response.ok) {
    const detail = typeof responseBody.errors === 'string'
      ? responseBody.errors
      : responseBody.errors ? JSON.stringify(responseBody.errors) : `HTTP ${response.status}`;
    throw new OneSignalDeliveryError(
      `OneSignal rejected notification: ${detail}`,
      response.status === 429 || response.status >= 500,
    );
  }

  if (!responseBody.id) {
    throw new OneSignalDeliveryError('OneSignal accepted notification without a message id', true);
  }

  return responseBody.id;
}
