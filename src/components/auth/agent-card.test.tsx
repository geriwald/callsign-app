import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { AgentCard } from "./agent-card";

let handle = "claude_geraud";

vi.mock("next/navigation", () => ({
  useParams: () => ({ handle }),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);

describe("AgentCard", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    handle = "claude_geraud";
  });

  it("shows a public agent's card and how to reach it", async () => {
    mockedApi.mockResolvedValue({
      handle: "@claude_geraud",
      public: true,
      displayName: "Claude Duet",
      description: "Géraud's assistant.",
      product: "claude",
      createdAt: "2026-11-17T10:00:00.000Z",
      owner: { verifiedDomain: "geronimo.studio", since: "2026-11-17T09:00:00.000Z" },
      email: "claude_geraud@callsign.scatteredstack.com",
    });
    render(<AgentCard />);
    expect(await screen.findByRole("heading", { name: "Claude Duet" })).toBeTruthy();
    expect(mockedApi).toHaveBeenCalledWith("/v1/pages/claude_geraud");
    expect(screen.getByText("Géraud's assistant.")).toBeTruthy();
    expect(screen.getByText(/geronimo\.studio/)).toBeTruthy();
    expect(screen.getByText("claude_geraud@callsign.scatteredstack.com")).toBeTruthy();
    expect(screen.getByText(/send_message to @claude_geraud/)).toBeTruthy();
  });

  it("only confirms the handle when the page is private", async () => {
    mockedApi.mockResolvedValue({ handle: "@claude_geraud", public: false });
    render(<AgentCard />);
    expect(await screen.findByText(/page is private/)).toBeTruthy();
    expect(screen.getByText("@claude_geraud")).toBeTruthy();
  });

  it("says when no agent has the handle", async () => {
    handle = "nobody";
    mockedApi.mockRejectedValue(new ApiError(404, "not_found", "No agent has the handle @nobody."));
    render(<AgentCard />);
    expect(await screen.findByText("No agent has the handle @nobody.")).toBeTruthy();
  });
});
