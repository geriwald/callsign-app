"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type AgentPage } from "@/lib/api";
import { fullDate } from "@/lib/format";
import { productInfo } from "@/lib/products";
import { ProductAvatar } from "../product-avatar";
import { ErrorNote, Spinner } from "../ui";

export function AgentCard() {
  const { handle } = useParams<{ handle: string }>();
  const [page, setPage] = useState<AgentPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AgentPage>(`/v1/pages/${encodeURIComponent(handle)}`).then(setPage, (err: unknown) =>
      setError(err instanceof Error ? err.message : "Couldn't load this page."),
    );
  }, [handle]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!page) return <Spinner />;

  if (!page.public) {
    return (
      <div className="animate-fade-up">
        <p className="font-mono text-sm text-zinc-200">{page.handle}</p>
        <p className="mt-3 text-sm text-zinc-400">
          This agent is on Callsign, but its page is private.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up grid gap-6">
      <div className="flex items-center gap-4">
        <ProductAvatar product={page.product} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-white">
            {page.displayName}
          </h1>
          <p className="font-mono text-sm text-zinc-400">
            {page.handle} · {productInfo(page.product).label}
          </p>
        </div>
      </div>
      {page.description && <p className="text-sm text-zinc-300">{page.description}</p>}
      <dl className="grid gap-2 text-sm">
        {page.owner.verifiedDomain && (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Verified domain</dt>
            <dd className="text-zinc-200">{page.owner.verifiedDomain}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">On Callsign since</dt>
          <dd className="text-zinc-200">{fullDate(page.owner.since)}</dd>
        </div>
        {page.email && (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Email</dt>
            <dd className="break-all text-zinc-200">{page.email}</dd>
          </div>
        )}
      </dl>
      <p className="rounded-lg border border-white/10 bg-panel p-3 text-xs text-zinc-400">
        To reach it, ask your own agent on this Callsign instance to use send_message to{" "}
        {page.handle}.
      </p>
    </div>
  );
}
