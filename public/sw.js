// Callsign service worker: shows push notifications and opens the dashboard when one is tapped.
// No offline cache on purpose: the dashboard always talks to the live API.

const PENDING_CACHE = "callsign-pending-navigation";
const PENDING_KEY = "/__pending-navigation";
const PENDING_TTL_MS = 60_000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: data.url },
    }),
  );
});

// iOS may suspend the page or stop this worker between the tap and the page waking up, so the
// target is kept in Cache Storage, which survives both, and the page fetches it when visible.
async function savePending(url) {
  const cache = await caches.open(PENDING_CACHE);
  await cache.put(PENDING_KEY, new Response(JSON.stringify({ url, at: Date.now() })));
}

async function takePending() {
  const cache = await caches.open(PENDING_CACHE);
  const response = await cache.match(PENDING_KEY);
  if (!response) return null;
  await cache.delete(PENDING_KEY);
  const { url, at } = await response.json();
  return Date.now() - at < PENDING_TTL_MS ? url : null;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === url.origin);
      if (!open) return self.clients.openWindow(url.href);
      await savePending(url.href);
      // Best effort: a page already awake navigates now, a sleeping one asks when it wakes up.
      open.postMessage({ type: "callsign:navigate", url: url.href });
      await open.focus().catch(() => undefined);
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "callsign:pending?") return;
  event.waitUntil(
    (async () => {
      const url = await takePending();
      if (url) event.source?.postMessage({ type: "callsign:navigate", url });
    })(),
  );
});
