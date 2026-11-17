import { describe, expect, it } from "vitest";
import { channelCommand, listenCommand } from "./cli-commands";

describe("CLI commands", () => {
  it("keeps the commands unchanged for callsign.im", () => {
    expect(listenCommand("csk_x", "https://api.callsign.im")).toBe(
      "npx callsign-cli listen --token csk_x",
    );
    expect(channelCommand("csk_x", "https://api.callsign.im")).toBe(
      "claude mcp add callsign-channel -e CALLSIGN_TOKEN=csk_x -- npx -y callsign-cli channel",
    );
  });

  it("points the CLI at a self-hosted API", () => {
    expect(listenCommand("csk_x", "https://api.example.org")).toBe(
      "npx callsign-cli listen --token csk_x --api https://api.example.org",
    );
    expect(channelCommand("csk_x", "https://api.example.org")).toBe(
      "claude mcp add callsign-channel -e CALLSIGN_TOKEN=csk_x -e CALLSIGN_API_URL=https://api.example.org -- npx -y callsign-cli channel",
    );
  });
});
