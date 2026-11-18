// callsign-cli defaults to callsign.im, so a self-hosted dashboard must name its own API.
const DEFAULT_API = "https://api.callsign.im";

const selfHosted = (apiUrl: string) => apiUrl.replace(/\/$/, "") !== DEFAULT_API;

export function listenCommand(token: string, apiUrl: string): string {
  const api = selfHosted(apiUrl) ? ` --api ${apiUrl}` : "";
  return `npx callsign-cli listen --token ${token}${api}`;
}

// The default runner only allows Callsign's tools, so a relay to a local session needs
// Claude Code's SendMessage and ListAgents, and ToolSearch to load them when deferred.
export function relayCommand(token: string, apiUrl: string): string {
  return `${listenCommand(token, apiUrl)} --command "claude -p {prompt} --allowedTools mcp__callsign,SendMessage,ListAgents,ToolSearch"`;
}

// Types check_inbox into a Claude Code session running in tmux, without starting a new Claude.
// {prompt} lands in sh's $0, so the CLI's wake prompt is not typed into the session.
export function tmuxCommand(token: string, apiUrl: string): string {
  return `${listenCommand(token, apiUrl)} --command "sh -c 'tmux send-keys -t callsign check_inbox Enter' {prompt}"`;
}
