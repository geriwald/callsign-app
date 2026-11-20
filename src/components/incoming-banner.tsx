"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Incoming = { title: string; url: string };

// What arrives while the app is open: the service worker broadcasts it, this shows it on top.
export function IncomingBanner() {
  const [incoming, setIncoming] = useState<Incoming | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("callsign");
    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; title?: string; url?: string } | null;
      if (data?.type !== "callsign:incoming" || !data.title || !data.url?.startsWith("/")) return;
      setIncoming({ title: data.title, url: data.url });
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!incoming) return;
    const timer = setTimeout(() => setIncoming(null), 20_000);
    return () => clearTimeout(timer);
  }, [incoming]);

  if (!incoming) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]"
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-panel/95 px-4 py-3 text-sm shadow-lg backdrop-blur-xl">
        <span className="min-w-0 flex-1 truncate text-white">{incoming.title}</span>
        <Link
          href={incoming.url}
          onClick={() => setIncoming(null)}
          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink"
        >
          Open
        </Link>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setIncoming(null)}
          className="text-zinc-500 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
