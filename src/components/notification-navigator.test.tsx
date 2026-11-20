import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationNavigator } from "./notification-navigator";

describe("NotificationNavigator", () => {
  const target = Object.assign(new EventTarget(), {
    ready: Promise.resolve({ active: { postMessage: vi.fn() } }),
  });
  const assign = vi.fn();

  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    vi.stubGlobal("navigator", { ...navigator, serviceWorker: target });
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      href: "https://callsign.example/dashboard",
      origin: "https://callsign.example",
      assign,
    });
    render(<NotificationNavigator />);
  }

  function post(data: unknown) {
    target.dispatchEvent(new MessageEvent("message", { data }));
  }

  it("opens the page a tapped notification points at, on this site only", () => {
    setup();
    post({ type: "callsign:navigate", url: "https://evil.example/x" });
    expect(assign).not.toHaveBeenCalled();
    post({ type: "callsign:navigate", url: "https://callsign.example/dashboard/account?push-test=t" });
    expect(assign).toHaveBeenCalledWith("https://callsign.example/dashboard/account?push-test=t");
  });

  it("asks the worker for a pending page when it becomes visible", async () => {
    setup();
    const registration = await target.ready;
    const ask = vi.mocked(registration.active.postMessage);
    ask.mockClear();
    window.dispatchEvent(new Event("focus"));
    await Promise.resolve();
    await Promise.resolve();
    expect(ask).toHaveBeenCalledWith({ type: "callsign:pending?" });
  });
});
