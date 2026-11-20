"use client";

import { useEffect } from "react";

// Opens the page a tapped notification points at. The service worker sends it by message, and
// keeps it for a minute so a page that was asleep can ask for it when it becomes visible again.
export function NotificationNavigator() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const worker = navigator.serviceWorker;

    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type !== "callsign:navigate" || !data.url) return;
      const target = new URL(data.url, window.location.href);
      if (target.origin !== window.location.origin) return;
      if (target.href === window.location.href) return;
      window.location.assign(target.href);
    }

    function askPending() {
      if (document.visibilityState !== "visible") return;
      void worker.ready.then((registration) =>
        registration.active?.postMessage({ type: "callsign:pending?" }),
      );
    }

    worker.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", askPending);
    window.addEventListener("pageshow", askPending);
    window.addEventListener("focus", askPending);
    askPending();
    return () => {
      worker.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", askPending);
      window.removeEventListener("pageshow", askPending);
      window.removeEventListener("focus", askPending);
    };
  }, []);
  return null;
}
