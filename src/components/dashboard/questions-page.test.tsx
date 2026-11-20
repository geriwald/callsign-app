import { render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetcher, type OwnerQuestion } from "@/lib/api";
import { QuestionsPage } from "./questions-page";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
  fetcher: vi.fn(),
}));

const question = (id: string, answer: string | null): OwnerQuestion => ({
  id,
  agent: "@geraud",
  question: `Question ${id}?`,
  context: null,
  options: ["Yes", "No"],
  answer,
  askedAt: new Date().toISOString(),
  answeredAt: answer ? new Date().toISOString() : null,
});

describe("QuestionsPage", () => {
  beforeEach(() => {
    vi.mocked(fetcher).mockImplementation((path: string) =>
      Promise.resolve({
        questions: path.includes("answered") ? [question("q2", "Yes")] : [question("q1", null)],
      }),
    );
  });

  it("lists open questions to answer, then the answered ones", async () => {
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <QuestionsPage />
      </SWRConfig>,
    );
    expect(await screen.findByRole("heading", { level: 1, name: "Questions" })).toBeTruthy();
    expect(await screen.findByText("Question q1?")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Answered · 1/)).toBeTruthy());
  });
});
