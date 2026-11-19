import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const inForkFrame = (el: Element) => el.closest("[data-fork]") !== null;

describe("AccountPage confidentiality default", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedFetcher.mockReset();
    mockedFetcher.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/v1/me/push"
          ? { publicKey: null, devices: [] }
          : { passkeys: [], reset: null, elevatedUntil: null },
      ),
    );
    mockedApi.mockResolvedValue({ owner: { ...owner, confidentialDefault: false } });
  });

  it("shows the default and saves a change", async () => {
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <OwnerContext.Provider value={owner}>
          <AccountPage />
        </OwnerContext.Provider>
      </SWRConfig>,
    );
    const toggle = screen.getByRole("switch", { name: "Make new conversations confidential" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(inForkFrame(screen.getByText("Confidential by default"))).toBe(true);
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/v1/me", {
        method: "PATCH",
        body: { confidentialDefault: false },
      }),
    );
  });
});
