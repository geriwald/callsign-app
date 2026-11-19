import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { InstanceForkCard, InstanceWelcome } from "@/components/instance";

export const metadata: Metadata = { title: "Sign in · Callsign" };

export default function LoginPage() {
  return (
    <>
      <InstanceWelcome />
      <Suspense>
        <LoginForm />
      </Suspense>
      <InstanceForkCard />
    </>
  );
}
