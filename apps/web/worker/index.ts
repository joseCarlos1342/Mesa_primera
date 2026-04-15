/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// ─── Push notification handler ─────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; broadcastId?: string; url?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Mesa Primera", body: event.data.text() };
  }

  const title = payload.title || "Mesa Primera";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: payload.broadcastId || `push-${Date.now()}`,
    renotify: true,
    data: { url: payload.url || "/lobby" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click handler ────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification.data?.url as string) || "/lobby";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab if one is open at the target origin
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return self.clients.openWindow(url);
    })
  );
});
