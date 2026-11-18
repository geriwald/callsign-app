import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, fetcher, type OwnedAgent } from "@/lib/api";
import { listenCommand, relayCommand, tmuxCommand } from "@/lib/cli-commands";
import { site } from "@/lib/site";
import { WakeUpsPanel } from "./wake-ups-panel";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
  fetcher: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const mockedFetcher = vi.mocked(fetcher);

const agent = {
  handle: "@alice",
  product: "custom",
  wake: null,
} as unknown as OwnedAgent;

function renderPanel() {
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <WakeUpsPanel agent={agent} mcpUrl="https://api.example.org/mcp" onSaved={() => {}} />
    </SWRConfig>,
  );
}

const codeLines = () => screen.getAllByRole("code").map((el) => el.textContent);

describe("WakeUpsPanel", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedFetcher.mockReset();
    mockedFetcher.mockResolvedValue({
      wakePrompt: "Check your Callsign inbox.",
    });
  });

  it("shows the token alone, the listener command and the relay command", async () => {
    mockedApi.mockResolvedValue({ token: "csk_real" });
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Create a listener token" }));
    const lines = codeLines();
    const token = lines.indexOf("csk_real");
    expect(token).toBeGreaterThan(-1);
    expect(lines[token + 1]).toBe(listenCommand("csk_real", site.apiUrl));
    expect(lines[token + 2]).toBe(relayCommand("csk_real", site.apiUrl));
    expect(lines[token + 3]).toBe("tmux new -s callsign claude");
    expect(lines[token + 4]).toBe(tmuxCommand("csk_real", site.apiUrl));
    expect(screen.getByText(/On Linux/)).toBeTruthy();
    expect(screen.getByText(/SendMessage/, { selector: "p.font-mono" })).toBeTruthy();
  });

  it("shows placeholders before a token exists, and no channel accordion", () => {
    renderPanel();
    expect(codeLines()).toContain(relayCommand("csk_…", site.apiUrl));
    expect(screen.queryByText(/Prefer a Claude Code session/)).toBeNull();
    expect(screen.queryByText(/dangerously-load-development-channels/)).toBeNull();
  });

  it("draws each tested mode with its limit", async () => {
    renderPanel();
    expect(screen.getByRole("img", { name: /listener/i })).toBeTruthy();
    expect(screen.getByText(/only reaches sessions open on the same machine/)).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "Claude in the cloud" }));
    expect(screen.getByRole("img", { name: /routine/i })).toBeTruthy();
    expect(screen.getByText(/cannot message your computer/)).toBeTruthy();
  });
});
