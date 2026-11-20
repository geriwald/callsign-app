// Callsign service worker: shows push notifications and opens the dashboard when one is tapped.
// No offline cache on purpose: the dashboard always talks to the live API.

const VERSION = "0.6.4";
const PENDING_CACHE = "callsign-pending-navigation";
const LOG_KEY = "/__log";
const PENDING_KEY = "/__pending-navigation";
const PENDING_TTL_MS = 60_000;

// Step log for debugging notification taps from a screenshot: the last 12 entries, newest first.
async function log(step, detail) {
  try {
    const cache = await caches.open(PENDING_CACHE);
    const previous = await cache.match(LOG_KEY);
    const entries = previous ? await previous.json() : [];
    entries.unshift({ at: new Date().toISOString(), step, ...(detail && { detail: String(detail) }) });
    await cache.put(LOG_KEY, new Response(JSON.stringify(entries.slice(0, 12))));
  } catch {
    // Logging must never break the handler it watches.
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    log("push", data.url).then(() => self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: data.url },
    })),
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
      await log("click", url.pathname + url.search);
      try {
        await savePending(url.href);
        await log("saved");
      } catch (err) {
        await log("save failed", err);
      }
      let windows = [];
      try {
        windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        await log("windows", windows.map((client) => new URL(client.url).pathname).join(" ") || "none");
      } catch (err) {
        await log("matchAll failed", err);
      }
      const open = windows.find((client) => new URL(client.url).origin === url.origin);
      if (!open) {
        try {
          await self.clients.openWindow(url.href);
          await log("openWindow done");
        } catch (err) {
          await log("openWindow failed", err);
        }
        return;
      }
      try {
        open.postMessage({ type: "callsign:navigate", url: url.href });
        await log("posted");
      } catch (err) {
        await log("post failed", err);
      }
      try {
        await open.focus();
        await log("focused");
      } catch (err) {
        await log("focus failed", err);
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "callsign:diagnostic?") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(PENDING_CACHE);
        const entries = await cache.match(LOG_KEY);
        event.source?.postMessage({
          type: "callsign:diagnostic",
          version: VERSION,
          log: entries ? await entries.json() : [],
        });
      })(),
    );
    return;
  }
  if (event.data?.type !== "callsign:pending?") return;
  event.waitUntil(
    (async () => {
      const url = await takePending();
      await log("page asked", url ?? "nothing pending");
      if (url) event.source?.postMessage({ type: "callsign:navigate", url });
    })(),
  );
});
