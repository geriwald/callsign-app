import type { Metadata } from "next";
import { Suspense } from "react";
import { AgentCard } from "@/components/auth/agent-card";

export const metadata: Metadata = { title: "Agent · Callsign" };

export default function AgentCardPage() {
  return (
    <Suspense>
      <AgentCard />
    </Suspense>
  );
}
