"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { Logo, LogoMark } from "../logo";
import { InstanceFooter } from "../instance";
import { Badge, Button } from "../ui";
import { usePendingApprovals } from "./approvals";
import { useOwner } from "./hooks";
import { usePendingQuestions } from "./questions-page";

type NavItem = { href: string; label: string; count?: number };

// On a phone the first three stay in the bar; the rest live in the menu.
const PRIMARY = [
  { href: "/dashboard", label: "Agents" },
  { href: "/dashboard/questions", label: "Questions" },
  { href: "/dashboard/approvals", label: "Approvals" },
];
const SECONDARY = [
  { href: "/dashboard/connections", label: "Connections" },
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/account", label: "Account" },
];
const ADMIN = { href: "/dashboard/admin", label: "Reports" };

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <InstanceFooter />
    </div>
  );
}

// Also shown on the public home page when the visitor is signed in.
export function DashboardHeader() {
  const owner = useOwner();
  const router = useRouter();
  const pathname = usePathname();
  const { mutate } = useSWRConfig();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const approvals = usePendingApprovals();
  const questions = usePendingQuestions();
  const primary: NavItem[] = PRIMARY.map((item) => ({
    ...item,
    count:
      item.href === "/dashboard/questions"
        ? questions
        : item.href === "/dashboard/approvals"
          ? approvals
          : 0,
  }));
  const secondary: NavItem[] = [...SECONDARY, ...(owner.admin ? [ADMIN] : [])];

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/dashboard/agents")
      : pathname.startsWith(href);
  }

  async function signOut() {
    setSigningOut(true);
    await api("/v1/auth/logout", { method: "POST" }).catch(() => undefined);
    await mutate(() => true, undefined, { revalidate: false });
    router.replace("/login");
  }

  function link(item: NavItem, onClick?: () => void) {
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 whitespace-nowrap transition sm:px-3 ${
          isActive(item.href) ? "bg-white/[0.06] text-white" : "text-zinc-500 hover:text-white"
        }`}
      >
        {item.label}
        {item.count ? <Badge tone="signal">{item.count}</Badge> : null}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <Link href="/about" aria-label="Callsign home" className="shrink-0">
            <LogoMark className="size-[22px] text-white lg:hidden" />
            <span className="hidden lg:block">
              <Logo />
            </span>
          </Link>
          <nav aria-label="Phone" className="flex items-center gap-0.5 text-sm md:hidden">
            {primary.map((item) => link(item))}
          </nav>
          <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
            {[...primary, ...secondary].map((item) => link(item))}
          </nav>
        </div>
        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <span className="hidden truncate text-sm text-zinc-500 xl:block">{owner.email}</span>
          <Button variant="ghost" size="sm" loading={signingOut} onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-zinc-300 hover:bg-white/[0.06] hover:text-white md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-5"
            aria-hidden="true"
          >
            {open ? (
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav aria-label="Menu" className="border-t border-white/5 px-4 pb-4 md:hidden">
          <ul className="grid gap-1 pt-2 text-sm">
            {secondary.map((item) => (
              <li key={item.href}>{link(item, () => setOpen(false))}</li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
            <span className="min-w-0 truncate text-xs text-zinc-500">{owner.email}</span>
            <Button variant="ghost" size="sm" loading={signingOut} onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
