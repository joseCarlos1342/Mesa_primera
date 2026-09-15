'use client';

import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';

type OneSignalClient = {
  init(options: {
    appId: string;
    serviceWorkerPath: string;
    serviceWorkerParam: { scope: string };
  }): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  Notifications: {
    isPushSupported(): boolean;
    permissionNative: NotificationPermission;
    requestPermission(): Promise<void>;
  };
  User: {
    PushSubscription: {
      optedIn: boolean;
      optIn(): Promise<void>;
    };
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalClient) => void | Promise<void>>;
  }
}

type OneSignalPushOptInProps = {
  userId: string;
  compact?: boolean;
};

let activeOneSignalClient: OneSignalClient | null = null;

export async function logoutOneSignalUser(): Promise<void> {
  const client = activeOneSignalClient;
  activeOneSignalClient = null;
  if (!client) return;

  try {
    await client.logout();
  } catch {
    // Supabase sign-out must continue even if OneSignal is unavailable.
  }
}

function getAppId(): string | null {
  return process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim()
    || window.__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim()
    || null;
}

export function OneSignalPushOptIn({ userId, compact = false }: OneSignalPushOptInProps) {
  const [oneSignal, setOneSignal] = useState<OneSignalClient | null>(null);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const appId = getAppId();
    if (!appId) return;
    let cancelled = false;
    let initializedClient: OneSignalClient | null = null;

    const init = (client: OneSignalClient) => {
      void client.init({
        appId,
        serviceWorkerPath: '/sw.js',
        serviceWorkerParam: { scope: '/' },
      }).then(async () => {
        await client.login(userId);
        if (cancelled) {
          await client.logout();
          return;
        }
        initializedClient = client;
        activeOneSignalClient = client;
        setOneSignal(client);
        setSupported(client.Notifications.isPushSupported());
        setPermission(client.Notifications.permissionNative);
      }).catch(() => undefined);
    };

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(init);

    if (document.querySelector('script[data-onesignal-sdk]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.dataset.onesignalSdk = 'true';
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      if (initializedClient && activeOneSignalClient === initializedClient) {
        activeOneSignalClient = null;
        void initializedClient.logout().catch(() => undefined);
      }
    };
  }, [userId]);

  const enablePush = async () => {
    if (!oneSignal) return;
    setBusy(true);
    setError(null);
    try {
      await oneSignal.Notifications.requestPermission();
      await oneSignal.User.PushSubscription.optIn();
      setPermission(oneSignal.Notifications.permissionNative);
    } catch {
      setError('No fue posible activar las notificaciones. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (!oneSignal || !supported || permission !== 'default') return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void enablePush()}
        disabled={busy}
        aria-label="Activar notificaciones push"
        className={compact
          ? 'flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-100 transition hover:bg-indigo-500/20 disabled:opacity-50'
          : 'flex items-center gap-2 rounded-button border border-brand-gold/30 bg-black/30 px-4 py-3 text-sm font-bold text-brand-gold transition hover:bg-brand-gold/10 disabled:opacity-50'}
      >
        <BellRing className="h-4 w-4" aria-hidden="true" />
        {!compact && (busy ? 'Activando…' : 'Activar avisos')}
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  );
}
