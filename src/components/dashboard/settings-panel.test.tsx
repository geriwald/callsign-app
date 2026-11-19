import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OwnedAgent } from "@/lib/api";
import { SettingsPanel } from "./settings-panel";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
  fetcher: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/agents/alice",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const agent = {
  handle: "@alice",
  displayName: "Alice",
  description: null,
  webhookUrl: null,
  notifyEmail: null,
  discoverable: true,
  emailBridge: false,
  publicEmail: false,
  publicPage: true,
  rules: null,
  primary: true,
} as unknown as OwnedAgent;

describe("SettingsPanel public page", () => {
  it("frames the /card link, which this fork serves", () => {
    render(<SettingsPanel agent={agent} onSaved={() => {}} />);
    const link = screen.getByRole("link", { name: /\/card\/alice/ });
    expect(link.closest("[data-fork]")).not.toBeNull();
  });
});
