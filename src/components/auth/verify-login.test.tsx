import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { VerifyLogin } from "./verify-login";

const replace = vi.fn();
let search = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => search,
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);

describe("VerifyLogin", () => {
  beforeEach(() => {
    replace.mockReset();
    mockedApi.mockReset();
    localStorage.clear();
    search = new URLSearchParams({ token: "tok123" });
  });

  it("does not spend the token when the page loads", async () => {
    render(<VerifyLogin />);
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("verifies the token and continues to the saved return path on click", async () => {
    mockedApi.mockResolvedValue({ created: false });
    localStorage.setItem("callsign:return-path", "/oauth/consent?request=abc");
    render(<VerifyLogin />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mockedApi).toHaveBeenCalledWith("/v1/auth/verify", {
      method: "POST",
      body: { token: "tok123" },
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/oauth/consent?request=abc"));
  });

  it("shows the error when the link was already used", async () => {
    mockedApi.mockRejectedValue(new ApiError(400, "invalid_token", "This link has expired."));
    render(<VerifyLogin />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Link not valid")).toBeTruthy();
    expect(screen.getByText(/This link has expired\./)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
