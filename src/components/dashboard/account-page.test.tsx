import { render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, fetcher, type Owner } from "@/lib/api";
import { AccountPage } from "./account-page";
import { OwnerContext } from "./hooks";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
  fetcher: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const mockedFetcher = vi.mocked(fetcher);

const owner: Owner = {
  id: "o1",
  email: "owner@example.com",
  showDomain: false,
  confidentialDefault: true,
  organizationDomain: null,
  admin: false,
  telegram: null,
  answer: { email: true, telegram: false, push: false, address: "owner@example.com", customAddress: false },
};


describe("AccountPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedFetcher.mockReset();
    mockedFetcher.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/v1/me/push"
          ? { publicKey: "pk", devices: [] }
          : { passkeys: [], reset: null, elevatedUntil: null },
      ),
    );
  });

  it("puts notifications first and the data cards last, with no confidentiality setting", async () => {
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <OwnerContext.Provider value={owner}>
          <AccountPage />
        </OwnerContext.Provider>
      </SWRConfig>,
    );
    await screen.findByRole("heading", { name: "Web app" });
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "Notifications",
      "Web app",
      "Email",
      "Passkeys",
      "Export your data",
      "Delete account",
    ]);
    expect(screen.queryByText(/Confidential by default/)).toBeNull();
    expect(screen.getByText("Content stays in the app")).toBeTruthy();
    expect(screen.getByText(/Install it on the home screen/)).toBeTruthy();
  });
});
