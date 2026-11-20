import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationNavigator } from "./notification-navigator";

describe("NotificationNavigator", () => {
  const target = new EventTarget();
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
});
