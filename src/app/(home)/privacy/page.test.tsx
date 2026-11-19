import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./page";

describe("PrivacyPage", () => {
  it("names the operator and how to reach him", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeTruthy();
    expect(screen.getByText(/Géraud Benazet/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "geraud.benazet@gmail.com" })).toBeTruthy();
  });

  it("covers the Telegram bot", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: "Telegram bot" })).toBeTruthy();
    expect(screen.getByText(/@callsign_geriwald_bot/)).toBeTruthy();
    expect(screen.getByText(/deletes your chat ID/)).toBeTruthy();
  });
});
