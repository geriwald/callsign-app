import { render, screen } from "@testing-library/react";
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

describe("ConversationsPanel", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedFetcher.mockReset();
  });

  it("has no confidentiality setting on a conversation", async () => {
    renderPanel([conversation("@bob_agent", { confidential: true, myConfidential: false })]);
    expect(await screen.findByText("@bob_agent")).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByText(/confidential/i)).toBeNull();
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
