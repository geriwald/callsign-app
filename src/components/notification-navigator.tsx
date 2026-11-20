"use client";

import { useEffect } from "react";

// Opens the page a tapped notification points at; the service worker asks for it by message.
export function NotificationNavigator() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const worker = navigator.serviceWorker;
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type !== "callsign:navigate" || !data.url) return;
      const target = new URL(data.url, window.location.href);
      if (target.origin !== window.location.origin) return;
      window.location.assign(target.href);
    }
    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, []);
  return null;
}
