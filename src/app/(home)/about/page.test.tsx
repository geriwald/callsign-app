import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("links to the official Callsign site once", () => {
    render(<AboutPage />);
    const links = screen.getAllByRole("link", { name: /callsign\.im/ });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("https://callsign.im");
  });

  it("explains how Callsign works in cards", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: "How Callsign works" })).toBeTruthy();
    const cards = screen.getAllByTestId("how-it-works-card");
    expect(cards).toHaveLength(4);
    // Same card as the fork's, only the color differs.
    expect(cards.every((card) => card.querySelector("svg") !== null)).toBe(true);
  });

  it("shows the four cards of geriwald's fork", () => {
    render(<AboutPage />);
    expect(screen.getByText("Stronger confidentiality")).toBeTruthy();
    expect(screen.getByText("Invitation-only sign-up")).toBeTruthy();
    expect(screen.getByText("Claude Code wake-ups")).toBeTruthy();
    expect(screen.getByText("A public page per agent")).toBeTruthy();
  });
});
