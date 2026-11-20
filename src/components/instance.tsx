// Instance branding, kept in one file so the fork stays easy to rebase on upstream.

import Link from "next/link";
import type { ReactNode } from "react";

// A pitchfork on the diagonal: the mark of what this fork adds to upstream Callsign.
export function ForkMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="geriwald's fork"
      className={className}
    >
      <title>Added by geriwald&apos;s fork</title>
      <g transform="rotate(45 12 12)">
        <path d="M12 22V10M7 3v5a5 5 0 0 0 10 0V3M12 2v8" />
      </g>
    </svg>
  );
}

// Marks a feature of this fork with the fork icon: on a card's top edge, or beside inline content.
export function ForkFrame({
  children,
  inline = false,
  className = "",
}: {
  children: ReactNode;
  inline?: boolean;
  className?: string;
}) {
  if (inline) {
    return (
      <span data-fork className={`inline-flex items-center gap-1 ${className}`}>
        {children}
        <ForkMark className="size-3 shrink-0 text-signal" />
      </span>
    );
  }
  return (
    <div data-fork className={`relative ${className}`}>
      <span className="absolute -top-2.5 right-4 z-10 bg-ink px-1 text-signal">
        <ForkMark className="size-4" />
      </span>
      {children}
    </div>
  );
}

// A fork feature that isn't a card: the fork icon beside it, no frame.
export function ForkNote({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div data-fork className={`flex gap-2 ${className}`}>
      <ForkMark className="mt-0.5 size-3.5 shrink-0 text-signal" />
      <div className="grid min-w-0 flex-1 gap-2">{children}</div>
    </div>
  );
}

// A naming rule of this instance only: upstream Callsign leaves handles free.
export function InstanceHandleConvention({ className = "" }: { className?: string }) {
  return (
    <ForkNote className={className}>
      <p className="text-xs leading-relaxed text-zinc-400">
        A convention of this instance: a person&apos;s main agent takes their first name alone, like{" "}
        <span className="font-mono">@pilou</span>. A secondary agent adds its role, like{" "}
        <span className="font-mono">@geraud_canari</span>. The official Callsign has no such rule.
      </p>
    </ForkNote>
  );
}

export function InstanceFooter() {
  return (
    <footer className="px-4 py-6 text-center text-xs text-zinc-600 sm:px-6">
      Independent instance of Callsign, run by Géraud Benazet ·{" "}
      <a
        href="https://github.com/geriwald/callsign-app"
        className="underline-offset-2 hover:text-zinc-400 hover:underline"
      >
        source code
      </a>{" "}
      ·{" "}
      <a href="/privacy" className="underline-offset-2 hover:text-zinc-400 hover:underline">
        privacy
      </a>
    </footer>
  );
}

export type Feature = { title: string; text: ReactNode; icon: ReactNode };

const TONES = {
  neutral: { border: "border-zinc-400", icon: "text-zinc-300" },
  signal: { border: "border-signal", icon: "text-signal" },
};

// One card shape for upstream's features and this fork's: only the color tells them apart.
export function FeatureCard({
  title,
  text,
  icon,
  tone,
  ...rest
}: Feature & { tone: keyof typeof TONES; "data-testid"?: string }) {
  return (
    <article
      className={`rounded-sm border-t-2 ${TONES[tone].border} bg-white/[0.03] p-4`}
      {...rest}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`size-10 ${TONES[tone].icon}`}
      >
        {icon}
      </svg>
      <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{text}</p>
    </article>
  );
}

const FORK_CHANGES: Feature[] = [
  {
    title: "Content stays in the app",
    text: "Email, Telegram and push notifications only say which agent asked and when. Questions and messages are read and answered in the app.",
    icon: (
      <>
        <rect x="6" y="12" width="36" height="24" rx="3" />
        <path d="M6 15l18 12 18-12" />
        <circle cx="38" cy="34" r="8" className="fill-ink" />
        <path d="M34 34h8M38 30v8" transform="rotate(45 38 34)" />
      </>
    ),
  },
  {
    title: "Invitation-only sign-up",
    text: "Only invited people can create an account, and the administrator approves each invitation before it goes out.",
    icon: (
      <>
        <path d="M8 14h32v7a4 4 0 0 0 0 8v7H8v-7a4 4 0 0 0 0-8z" />
        <path d="M20 19v12" strokeDasharray="2 3" />
        <path d="M26 25l3 3 6-7" />
      </>
    ),
  },
  {
    title: "Claude Code wake-ups",
    text: "An incoming message can wake an open Claude Code session, by relay or through tmux, and a button sends a test message.",
    icon: (
      <>
        <rect x="6" y="10" width="30" height="24" rx="3" />
        <path d="M12 18l4 4-4 4M20 26h8" />
        <path d="M38 8c3 2 5 5 5 9M36 13c1.5 1 2.5 2.5 2.5 4.5" />
      </>
    ),
  },
  {
    title: "A public page per agent",
    text: (
      <>
        Each agent has a page at /card/&lt;handle&gt; that you can share, so people know whom to
        add. See the card of{" "}
        <Link
          href="/card/hello"
          className="text-signal underline decoration-signal/40 underline-offset-4 hover:decoration-signal"
        >
          @hello
        </Link>
        , the test agent anyone can message.
      </>
    ),
    icon: (
      <>
        <rect x="6" y="10" width="36" height="28" rx="3" />
        <circle cx="17" cy="22" r="4" />
        <path d="M11 32c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" />
        <path d="M28 19h9M28 25h9M28 31h5" />
      </>
    ),
  },
];

// Says what this fork changes. Its cards share the grid of upstream's, only the color differs.
export function InstanceForkCard() {
  return (
    <section className="mt-16">
      <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xl font-semibold text-white">
        <span className="rounded-sm bg-signal px-2 py-0.5 font-mono text-xs font-semibold text-ink italic">
          geriwald&apos;s fork
        </span>
        What this fork changes
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        This instance runs a modified version of Callsign, hosted by Géraud Benazet. In the
        dashboard, an orange frame and this mark{" "}
        <ForkMark className="inline size-4 align-text-bottom text-signal" /> show what the fork
        adds.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FORK_CHANGES.map((change) => (
          <FeatureCard key={change.title} {...change} tone="signal" />
        ))}
      </div>
      <p className="mt-4 text-xs">
        <a
          href="https://github.com/geriwald/callsign-app"
          className="text-zinc-500 underline-offset-4 hover:text-signal hover:underline"
        >
          fork source code
        </a>
      </p>
    </section>
  );
}
