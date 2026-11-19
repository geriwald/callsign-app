"use client";

import Link from "next/link";
import type { Owner } from "@/lib/api";
import { DashboardHeader } from "./dashboard/shell";
import { OwnerContext, useApi } from "./dashboard/hooks";
import { HomeLogo } from "./logo";

// A signed-in owner keeps the dashboard's navigation; a visitor gets the logo and a way in.
export function HomeHeader() {
  const { data } = useApi<{ owner: Owner }>("/v1/me");
  if (data) {
    return (
      <OwnerContext value={data.owner}>
        <DashboardHeader />
      </OwnerContext>
    );
  }
  return <PublicHeader />;
}

export function PublicHeader() {
  return (
    <header className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
      <HomeLogo />
      <Link href="/login" className="text-sm text-zinc-400 transition hover:text-white">
        Sign in
      </Link>
    </header>
  );
}
