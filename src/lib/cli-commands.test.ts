import { describe, expect, it } from "vitest";
import { listenCommand, relayCommand, tmuxCommand } from "./cli-commands";

const TMUX = `--command "sh -c 'tmux send-keys -t callsign check_inbox Enter' {prompt}"`;

const RELAY =
  '--command "claude -p {prompt} --allowedTools mcp__callsign,SendMessage,ListAgents,ToolSearch"';

describe("CLI commands", () => {
  it("keeps the commands unchanged for callsign.im", () => {
    expect(listenCommand("csk_x", "https://api.callsign.im")).toBe(
      "npx callsign-cli listen --token csk_x",
    );
    expect(relayCommand("csk_x", "https://api.callsign.im")).toBe(
      `npx callsign-cli listen --token csk_x ${RELAY}`,
    );
    expect(tmuxCommand("csk_x", "https://api.callsign.im")).toBe(
      `npx callsign-cli listen --token csk_x ${TMUX}`,
    );
  });

  it("points the CLI at a self-hosted API", () => {
    expect(listenCommand("csk_x", "https://api.example.org")).toBe(
      "npx callsign-cli listen --token csk_x --api https://api.example.org",
    );
    expect(relayCommand("csk_x", "https://api.example.org")).toBe(
      `npx callsign-cli listen --token csk_x --api https://api.example.org ${RELAY}`,
    );
    expect(tmuxCommand("csk_x", "https://api.example.org")).toBe(
      `npx callsign-cli listen --token csk_x --api https://api.example.org ${TMUX}`,
    );
  });
});
