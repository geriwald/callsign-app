import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("LoginForm on an invite-only server", () => {
  beforeEach(() => {
    replace.mockReset();
    mockedApi.mockReset();
    search = new URLSearchParams();
  });

  function signedOut(mode: "open" | "invite") {
    mockedApi.mockImplementation(async (path: string) => {
      if (path === "/v1/signup") return { mode };
      if (path === "/v1/auth/login") return { status: "sent" };
      throw new ApiError(401, "unauthorized", "Sign in first.");
    });
  }

  it("tells visitors that access is by invitation", async () => {
    signedOut("invite");
    render(<LoginForm />);
    expect(await screen.findByText(/by invitation/)).toBeTruthy();
  });

  it("says nothing about invitations on an open server", async () => {
    signedOut("open");
    render(<LoginForm />);
    await screen.findByRole("textbox");
    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/v1/signup"));
    expect(screen.queryByText(/by invitation/)).toBeNull();
  });

  it("doesn't promise a link to an address that may not be invited", async () => {
    signedOut("invite");
    render(<LoginForm />);
    await screen.findByText(/by invitation/);
    await userEvent.type(screen.getByRole("textbox"), "guest@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send sign-in link" }));
    expect(await screen.findByText(/invited or already a member/)).toBeTruthy();
    expect(screen.queryByText(/We sent a sign-in link/)).toBeNull();
  });
});
