"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { takePendingHandle } from "@/lib/pending-handle";
import { takeReturnPath } from "@/lib/return-path";
import { Button, ButtonLink } from "../ui";

export function VerifyLogin() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify only on click: mail link scanners open the page and run its scripts, which would
  // spend the single-use token before the owner gets there.
  function signIn() {
    setSigningIn(true);
    api<{ created: boolean }>("/v1/auth/verify", { method: "POST", body: { token } }).then(
      ({ created }) => {
        track(created ? "sign_up" : "login", { method: "email" });
        const back = takeReturnPath();
        const claim = takePendingHandle();
        router.replace(
          back ?? (claim ? `/dashboard?claim=${encodeURIComponent(claim)}` : "/dashboard"),
        );
      },
      (err: unknown) => setError(err instanceof Error ? err.message : "Sign-in failed."),
    );
  }

  if (!token || error) {
    return (
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Link not valid</h1>
        <p className="mt-3 text-sm text-zinc-400">
          {error ?? "This sign-in link is incomplete."} Request a new one to continue.
        </p>
        <ButtonLink href="/login" className="mt-8">
          Back to sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in to Callsign</h1>
      <p className="mt-3 text-sm text-zinc-400">Continue to sign in on this device.</p>
      <Button loading={signingIn} onClick={signIn} className="mt-8 w-full">
        Sign in
      </Button>
    </div>
  );
}
