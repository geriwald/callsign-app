import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ForkFrame, InstanceFooter, InstanceForkCard, InstanceHandleConvention } from "./instance";

describe("InstanceForkCard", () => {
  it("says what the fork adds and leaves the official link to the page above it", () => {
    render(<InstanceForkCard />);
    expect(screen.getByText("geriwald's fork")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(screen.getByText(/Telegram/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /callsign\.im/ })).toBeNull();
    expect(screen.getByRole("link", { name: "@hello" }).getAttribute("href")).toBe("/card/hello");
    expect(screen.getByRole("link", { name: /fork source code/ }).getAttribute("href")).toBe(
      "https://github.com/geriwald/callsign-app",
    );
  });
});

describe("InstanceFooter", () => {
  it("names the fork owner and links to the fork's source", () => {
    render(<InstanceFooter />);
    expect(screen.getByText(/Independent instance of Callsign/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "source code" }).getAttribute("href")).toBe(
      "https://github.com/geriwald/callsign-app",
    );
  });

  it("links to the privacy policy", () => {
    render(<InstanceFooter />);
    expect(screen.getByRole("link", { name: "privacy" }).getAttribute("href")).toBe("/privacy");
  });
});

describe("ForkFrame", () => {
  it("frames a feature of this fork and marks it with the fork icon", () => {
    render(
      <ForkFrame>
        <p>Confidential by default</p>
      </ForkFrame>,
    );
    expect(screen.getByRole("img", { name: "geriwald's fork" })).toBeTruthy();
    expect(screen.getByText("Confidential by default").closest("[data-fork]")).not.toBeNull();
  });

  it("frames a small element inline", () => {
    render(
      <ForkFrame inline>
        <span>Test agent</span>
      </ForkFrame>,
    );
    const frame = screen.getByText("Test agent").parentElement;
    expect(frame?.tagName).toBe("SPAN");
    expect(screen.getByRole("img", { name: "geriwald's fork" })).toBeTruthy();
  });
});

describe("InstanceHandleConvention", () => {
  it("is framed as a rule of this fork", () => {
    render(<InstanceHandleConvention />);
    expect(screen.getByText(/A convention of this instance/).closest("[data-fork]")).not.toBeNull();
  });
});
