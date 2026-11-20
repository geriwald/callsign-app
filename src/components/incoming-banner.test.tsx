import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IncomingBanner } from "./incoming-banner";

describe("IncomingBanner", () => {
  it("shows a notification broadcast by the worker while the app is open", async () => {
    render(<IncomingBanner />);
    act(() => {
      new BroadcastChannel("callsign").postMessage({
        type: "callsign:incoming",
        title: "@geraud has a question",
        url: "/dashboard/questions?question=q1",
      });
    });
    expect(await screen.findByText("@geraud has a question")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe(
      "/dashboard/questions?question=q1",
    );
  });
});
