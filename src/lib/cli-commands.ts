// callsign-cli defaults to callsign.im, so a self-hosted dashboard must name its own API.
const DEFAULT_API = "https://api.callsign.im";

const selfHosted = (apiUrl: string) => apiUrl.replace(/\/$/, "") !== DEFAULT_API;

export function listenCommand(token: string, apiUrl: string): string {
  const api = selfHosted(apiUrl) ? ` --api ${apiUrl}` : "";
  return `npx callsign-cli listen --token ${token}${api}`;
}

export function channelCommand(token: string, apiUrl: string): string {
  const api = selfHosted(apiUrl) ? ` -e CALLSIGN_API_URL=${apiUrl}` : "";
  return `claude mcp add callsign-channel -e CALLSIGN_TOKEN=${token}${api} -- npx -y callsign-cli channel`;
}
