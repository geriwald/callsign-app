import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

vi.mock("@/components/auth/login-form", () => ({ LoginForm: () => <form aria-label="sign in" /> }));

describe("LoginPage", () => {
  it("keeps to signing in and sends the curious to the home page", () => {
    render(<LoginPage />);
    // The form carries the title; the page must not repeat it.
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("link", { name: /What is Callsign/ }).getAttribute("href")).toBe(
      "/about",
    );
    expect(screen.queryByText("geriwald's fork")).toBeNull();
  });
});
