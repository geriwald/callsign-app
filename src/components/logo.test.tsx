import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";

describe("Logo", () => {
  it("names this fork under the Callsign wordmark", () => {
    render(<Logo />);
    expect(screen.getByText("callsign")).toBeTruthy();
    expect(screen.getByText("geriwald's fork")).toBeTruthy();
  });
});
