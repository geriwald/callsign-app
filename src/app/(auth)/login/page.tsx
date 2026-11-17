import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RelaisWelcome } from "@/components/relais";

export const metadata: Metadata = { title: "Sign in · Callsign" };

export default function LoginPage() {
  return (
    <>
      <RelaisWelcome />
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
