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

const inForkFrame = (el: Element) => el.closest("[data-fork]") !== null;

describe("ConversationsPanel confidentiality", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedFetcher.mockReset();
    mockedApi.mockResolvedValue({ confidential: true, myConfidential: true });
  });

  it("shows each conversation's confidential switch", async () => {
    renderPanel([
      conversation("@bob_agent", { confidential: true, myConfidential: true }),
      conversation("@carol_agent", { confidential: false, myConfidential: false }),
    ]);
    const bob = await screen.findByRole("switch", { name: "Keep @bob_agent confidential" });
    const carol = screen.getByRole("switch", { name: "Keep @carol_agent confidential" });
    expect(bob.getAttribute("aria-checked")).toBe("true");
    expect(carol.getAttribute("aria-checked")).toBe("false");
    expect(inForkFrame(bob)).toBe(true);
    expect(inForkFrame(carol)).toBe(true);
  });

  it("turns the owner's flag on without opening the conversation", async () => {
    renderPanel([conversation("@bob_agent", { confidential: false, myConfidential: false })]);
    const toggle = await screen.findByRole("switch", { name: "Keep @bob_agent confidential" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/v1/agents/alice_agent/conversations/bob_agent", {
        method: "PATCH",
        body: { confidential: true },
      }),
    );
  });

  it("keeps the switch orange and explains it in a tooltip when another member holds it", async () => {
    renderPanel([
      conversation("@bob_agent", { confidential: true, myConfidential: false }),
      conversation("@carol_agent", { confidential: false, myConfidential: false }),
    ]);
    const toggle = await screen.findByRole("switch", { name: "Keep @bob_agent confidential" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByText("Kept confidential by another member")).toBeNull();
    expect(screen.getAllByTitle(/kept confidential by another member/i)).toHaveLength(1);
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/v1/agents/alice_agent/conversations/bob_agent", {
        method: "PATCH",
        body: { confidential: true },
      }),
    );
  });

  it("marks the switch as a fork feature with the fork icon, not a frame", async () => {
    renderPanel([conversation("@bob_agent", { confidential: false, myConfidential: false })]);
    const toggle = await screen.findByRole("switch", { name: "Keep @bob_agent confidential" });
    const marked = toggle.closest("[data-fork]");
    expect(marked?.querySelector("svg")).toBeTruthy();
    expect(marked?.className).not.toContain("border-signal");
  });
});

describe("ConversationsPanel @hello", () => {
  beforeEach(() => {
    mockedFetcher.mockReset();
  });

  it("labels @hello as the instance's test agent and links to its card", async () => {
    renderPanel([
      conversation("@hello", { confidential: false, myConfidential: false }),
      conversation("@bob_agent", { confidential: false, myConfidential: false }),
    ]);
    await screen.findByText("@bob_agent");
    expect(screen.getAllByText("Test agent")).toHaveLength(1);
    expect(inForkFrame(screen.getByText("Test agent"))).toBe(true);
    const link = screen.getByRole("link", { name: "About @hello" });
    expect(link.getAttribute("href")).toBe("/card/hello");
  });
});
