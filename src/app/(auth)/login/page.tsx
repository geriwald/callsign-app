import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in · Callsign" };

// Signing in only: what Callsign is and what this fork changes live on /about.
export default function LoginPage() {
  return (
    <>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-sm">
        <Link
          href="/about"
          className="text-zinc-500 underline-offset-4 hover:text-signal hover:underline"
        >
          What is Callsign, and what this fork changes →
        </Link>
      </p>
    </>
  );
}
