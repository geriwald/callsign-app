import type { ReactNode } from "react";
import { HomeHeader } from "@/components/home-header";
import { InstanceFooter } from "@/components/instance";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <HomeHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-24 sm:px-6">{children}</main>
      <InstanceFooter />
    </div>
  );
}
