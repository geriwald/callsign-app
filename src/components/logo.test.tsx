import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeLogo, Logo } from "./logo";

describe("Logo", () => {
  it("names this fork under the Callsign wordmark", () => {
    render(<Logo />);
    expect(screen.getByText("callsign")).toBeTruthy();
    expect(screen.getByText("geriwald's fork")).toBeTruthy();
  });

  it("leads to the instance home page", () => {
    render(<HomeLogo />);
    expect(screen.getByRole("link", { name: "Callsign home" }).getAttribute("href")).toBe("/about");
  });
});
