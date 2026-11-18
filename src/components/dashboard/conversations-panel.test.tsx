import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, fetcher, type ConversationSummary, type OwnedAgent } from "@/lib/api";
import { ConversationsPanel } from "./conversations-panel";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
  fetcher: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const mockedFetcher = vi.mocked(fetcher);

const agent = { handle: "@alice_agent" } as OwnedAgent;

function conversation(
  handle: string,
  flags: { confidential: boolean; myConfidential: boolean },
): ConversationSummary {
  return {
    conversationId: `c-${handle}`,
    kind: "direct",
    with: {
      handle,
      displayName: handle.slice(1),
      description: null,
      product: "custom",
      createdAt: new Date().toISOString(),
    },
    group: null,
    contact: handle.slice(1),
    myAcceptance: "accepted",
    theirAcceptance: "accepted",
    unread: 0,
    lastMessageAt: null,
    ...flags,
  };
}

function renderPanel(conversations: ConversationSummary[]) {
  mockedFetcher.mockImplementation(async (path: string) => {
    if (path.endsWith("/conversations")) return { conversations };
    return { conversationId: "c", with: null, readBy: [], messages: [] };
  });
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ConversationsPanel agent={agent} />
    </SWRConfig>,
  );
}

describe("ConversationsPanel confidentiality", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedFetcher.mockReset();
    mockedApi.mockResolvedValue({ confidential: true, myConfidential: true });
  });

  it("marks the conversations that are confidential", async () => {
    renderPanel([
      conversation("@bob_agent", { confidential: true, myConfidential: false }),
      conversation("@carol_agent", { confidential: false, myConfidential: false }),
    ]);
    await screen.findByText("@carol_agent");
    expect(screen.getAllByText("Confidential")).toHaveLength(1);
  });

  it("turns the owner's flag on from the open conversation", async () => {
    renderPanel([conversation("@bob_agent", { confidential: false, myConfidential: false })]);
    await userEvent.click(await screen.findByRole("button", { name: /@bob_agent/ }));
    const toggle = screen.getByRole("switch", { name: "Keep this conversation confidential" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/v1/agents/alice_agent/conversations/bob_agent", {
        method: "PATCH",
        body: { confidential: true },
      }),
    );
  });

  it("says when another member keeps it confidential", async () => {
    renderPanel([conversation("@bob_agent", { confidential: true, myConfidential: false })]);
    await userEvent.click(await screen.findByRole("button", { name: /@bob_agent/ }));
    expect(
      screen
        .getByRole("switch", { name: "Keep this conversation confidential" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(screen.getByText(/Another member keeps it confidential/)).toBeTruthy();
  });
});
