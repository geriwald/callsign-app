import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, type Owner } from "@/lib/api";
import { AnswerSettings } from "./answer-channels";
import { OwnerContext } from "./hooks";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);

const base: Owner = {
  id: "o1",
  email: "owner@example.com",
  showDomain: false,
  confidentialDefault: true,
  organizationDomain: null,
  admin: false,
  telegram: { linked: false },
  answer: { email: true, telegram: false, address: "owner@example.com", customAddress: false },
};

function renderWith(owner: Owner) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <OwnerContext.Provider value={owner}>
        <AnswerSettings />
      </OwnerContext.Provider>
    </SWRConfig>,
  );
}

describe("AnswerSettings", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedApi.mockResolvedValue({});
  });

  it("keeps the last channel on and Telegram off until it's linked", () => {
    renderWith(base);
    const email = screen.getByRole("switch", { name: "Answer by email" });
    const telegram = screen.getByRole("switch", { name: "Answer on Telegram" });
    expect(email.getAttribute("aria-checked")).toBe("true");
    expect(email.hasAttribute("disabled")).toBe(true);
    expect(telegram.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/at least one/i)).toBeTruthy();
  });

  it("switches email off once Telegram is on", async () => {
    renderWith({
      ...base,
      telegram: { linked: true },
      answer: { ...base.answer, telegram: true },
    });
    const email = screen.getByRole("switch", { name: "Answer by email" });
    expect(email.hasAttribute("disabled")).toBe(false);
    await userEvent.click(email);
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/v1/me", {
        method: "PATCH",
        body: { answerEmail: false },
      }),
    );
  });

  it("changes the answer address with a code", async () => {
    renderWith(base);
    await userEvent.click(screen.getByRole("button", { name: "Use another address" }));
    await userEvent.type(screen.getByLabelText("New address"), "phone@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send a code" }));
    expect(mockedApi).toHaveBeenCalledWith("/v1/me/answer-address", {
      method: "POST",
      body: { email: "phone@example.com" },
    });
    await userEvent.type(await screen.findByLabelText("Code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(mockedApi).toHaveBeenCalledWith("/v1/me/answer-address/confirm", {
      method: "POST",
      body: { code: "123456" },
    });
  });

  it("tests each channel", async () => {
    renderWith({ ...base, telegram: { linked: true } });
    await userEvent.click(screen.getByRole("button", { name: "Test email" }));
    await userEvent.click(screen.getByRole("button", { name: "Test Telegram" }));
    expect(mockedApi).toHaveBeenCalledWith("/v1/me/answer-test", {
      method: "POST",
      body: { channel: "email" },
    });
    expect(mockedApi).toHaveBeenCalledWith("/v1/me/answer-test", {
      method: "POST",
      body: { channel: "telegram" },
    });
    expect(await screen.findAllByText("Sent. Check that it arrived.")).toHaveLength(2);
  });
});
