import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, fetcher, type Owner, type PushDevice } from "@/lib/api";
import { subscribeDevice } from "@/lib/web-push";
import { AnswerSettings } from "./answer-channels";
import { OwnerContext } from "./hooks";

let search = new URLSearchParams();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => search,
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
  fetcher: vi.fn(),
}));

vi.mock("@/lib/web-push", () => ({
  pushSupported: () => true,
  isStandalone: () => true,
  platform: () => "ios",
  deviceLabel: () => "iPhone",
  subscribeDevice: vi.fn(() =>
    Promise.resolve({
      endpoint: "https://push.example.com/1",
      keys: { p256dh: "k", auth: "a" },
    }),
  ),
}));

const mockedApi = vi.mocked(api);
const mockedFetcher = vi.mocked(fetcher);
let devices: PushDevice[] = [];

const base: Owner = {
  id: "o1",
  email: "owner@example.com",
  showDomain: false,
  confidentialDefault: true,
  organizationDomain: null,
  admin: false,
  telegram: { linked: false },
  answer: { email: true, telegram: false, push: false, address: "owner@example.com", customAddress: false },
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
    devices = [];
    search = new URLSearchParams();
    replace.mockReset();
    mockedFetcher.mockReset();
    mockedFetcher.mockImplementation(() => Promise.resolve({ publicKey: "pk", devices }));
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

  it("keeps the web app off until a device passed the question test", async () => {
    devices = [{ id: "d1", label: "iPhone", createdAt: "", tested: false }];
    renderWith(base);
    const toggle = await screen.findByRole("switch", { name: "Answer in the web app" });
    expect(toggle.hasAttribute("disabled")).toBe(true);
  });

  it("lets a tested device turn the web app on", async () => {
    devices = [{ id: "d1", label: "iPhone", createdAt: "", tested: true }];
    renderWith(base);
    const toggle = await screen.findByRole("switch", { name: "Answer in the web app" });
    await waitFor(() => expect(toggle.hasAttribute("disabled")).toBe(false));
    await userEvent.click(toggle);
    expect(mockedApi).toHaveBeenCalledWith("/v1/me", {
      method: "PATCH",
      body: { answerPush: true },
    });
  });

  it("subscribes this device and tests it", async () => {
    renderWith(base);
    await userEvent.click(await screen.findByRole("button", { name: "Turn on notifications" }));
    await waitFor(() => expect(vi.mocked(subscribeDevice)).toHaveBeenCalledWith("pk"));
    expect(mockedApi).toHaveBeenCalledWith("/v1/me/push", {
      method: "POST",
      body: {
        endpoint: "https://push.example.com/1",
        keys: { p256dh: "k", auth: "a" },
        label: "iPhone",
      },
    });
  });

  it("sends both tests to a device", async () => {
    devices = [{ id: "d1", label: "iPhone", createdAt: "", tested: false }];
    renderWith(base);
    await userEvent.click(await screen.findByRole("button", { name: "Test notification" }));
    await userEvent.click(screen.getByRole("button", { name: "Test question" }));
    expect(mockedApi).toHaveBeenCalledWith("/v1/me/push/d1/test", {
      method: "POST",
      body: { kind: "notification" },
    });
    expect(mockedApi).toHaveBeenCalledWith("/v1/me/push/d1/test", {
      method: "POST",
      body: { kind: "question" },
    });
  });

  it("confirms a tapped test question when the app opens on this page", async () => {
    search = new URLSearchParams({ "push-test": "tok123" });
    renderWith(base);
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/v1/me/push/confirm", {
        method: "POST",
        body: { token: "tok123" },
      }),
    );
    expect(await screen.findByText(/Test passed/)).toBeTruthy();
    expect(replace).toHaveBeenCalledWith("/dashboard/account");
  });
});
