import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, fetcher, type Owner } from "@/lib/api";
import { AdminPage } from "./admin-page";
import { OwnerContext } from "./hooks";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
  fetcher: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const mockedFetcher = vi.mocked(fetcher);

const admin: Owner = {
  id: "o1",
  email: "admin@example.com",
  showDomain: false,
  confidentialDefault: false,
  organizationDomain: null,
  admin: true,
  telegram: null,
  answer: { email: true, telegram: false, push: false, address: "owner@example.com", customAddress: false },
};

const invitation = {
  id: "0195f0a0-0000-7000-8000-000000000001",
  from: "@member_agent",
  fromName: "Member",
  to: "g***@example.com",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

function renderAdminPage() {
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <OwnerContext.Provider value={admin}>
        <AdminPage />
      </OwnerContext.Provider>
    </SWRConfig>,
  );
}

const inForkFrame = (el: Element) => el.closest("[data-fork]") !== null;

describe("AdminPage pending invitations", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedFetcher.mockReset();
    mockedFetcher.mockImplementation(async (path: string) => {
      if (path === "/v1/admin/invitations") return { invitations: [invitation] };
      if (path === "/v1/admin/suspended") return { agents: [] };
      return { reports: [] };
    });
    mockedApi.mockResolvedValue({ invitation });
  });

  it("lists invitations waiting for an admin with the masked address", async () => {
    renderAdminPage();
    expect(await screen.findByText("g***@example.com")).toBeTruthy();
    expect(screen.getByText(/@member_agent/)).toBeTruthy();
    expect(inForkFrame(screen.getByText("Pending invitations"))).toBe(true);
  });

  it.each([
    ["Approve", "approve"],
    ["Decline", "decline"],
  ])("sends the decision when the admin clicks %s", async (label, decision) => {
    renderAdminPage();
    await screen.findByText("g***@example.com");
    await userEvent.click(screen.getByRole("button", { name: label }));
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(`/v1/admin/invitations/${invitation.id}`, {
        method: "POST",
        body: { decision },
      }),
    );
  });

  it("shows nothing when no invitation is waiting", async () => {
    mockedFetcher.mockImplementation(async (path: string) => {
      if (path === "/v1/admin/invitations") return { invitations: [] };
      if (path === "/v1/admin/suspended") return { agents: [] };
      return { reports: [] };
    });
    renderAdminPage();
    await screen.findByText("No open reports.");
    expect(screen.queryByText("Pending invitations")).toBeNull();
  });
});
