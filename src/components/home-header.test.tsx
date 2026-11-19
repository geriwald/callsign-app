import { render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetcher, type Owner } from "@/lib/api";
import { HomeHeader, PublicHeader } from "./home-header";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
  fetcher: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/about",
  useRouter: () => ({ replace: vi.fn() }),
}));

const mockedFetcher = vi.mocked(fetcher);

const owner: Owner = {
  id: "o1",
  email: "owner@example.com",
  showDomain: false,
  confidentialDefault: false,
  organizationDomain: null,
  admin: false,
  telegram: null,
  answer: { email: true, telegram: false, push: false, address: "owner@example.com", customAddress: false },
};

function renderHeader() {
  render(
    <SWRConfig
      value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}
    >
      <HomeHeader />
    </SWRConfig>,
  );
}

describe("HomeHeader", () => {
  beforeEach(() => mockedFetcher.mockReset());

  it("shows the dashboard navigation to a signed-in owner", async () => {
    mockedFetcher.mockImplementation(async (path: string) =>
      path === "/v1/me" ? { owner } : { holds: [], pending: 0 },
    );
    renderHeader();
    expect(await screen.findByRole("link", { name: "Connections" })).toBeTruthy();
    expect(screen.getByText("owner@example.com")).toBeTruthy();
  });
});

describe("PublicHeader", () => {
  it("offers a visitor to sign in", () => {
    render(<PublicHeader />);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Callsign home" })).toBeTruthy();
  });
});
