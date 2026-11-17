import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { LoginForm } from "./login-form";

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

function signedIn() {
  mockedApi.mockImplementation(async (path: string) => {
    if (path === "/v1/me") return { owner: { id: "o1", email: "me@example.com" } };
    throw new Error(`unexpected call to ${path}`);
  });
}

async function expectRedirectWithoutForm(to: string) {
  render(<LoginForm />);
  expect(screen.queryByRole("textbox")).toBeNull();
  await waitFor(() => expect(replace).toHaveBeenCalledWith(to));
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(mockedApi).not.toHaveBeenCalledWith("/v1/auth/login", expect.anything());
}

describe("LoginForm with an existing session", () => {
  beforeEach(() => {
    replace.mockReset();
    mockedApi.mockReset();
    search = new URLSearchParams();
  });

  it("sends a signed-in visitor to the dashboard", async () => {
    signedIn();
    await expectRedirectWithoutForm("/dashboard");
  });

  it("honors a local next path, such as the oauth consent", async () => {
    signedIn();
    search = new URLSearchParams({ next: "/oauth/consent?request=abc" });
    await expectRedirectWithoutForm("/oauth/consent?request=abc");
  });

  it("ignores a next path that leaves the site", async () => {
    signedIn();
    search = new URLSearchParams({ next: "//evil.example/steal" });
    await expectRedirectWithoutForm("/dashboard");
  });

  it("continues a handle claim on the dashboard", async () => {
    signedIn();
    search = new URLSearchParams({ handle: "@Alice" });
    await expectRedirectWithoutForm("/dashboard?claim=alice");
  });

  it("shows the email form when there is no session", async () => {
    mockedApi.mockRejectedValue(new ApiError(401, "unauthorized", "Sign in first."));
    render(<LoginForm />);
    expect(await screen.findByRole("textbox")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
