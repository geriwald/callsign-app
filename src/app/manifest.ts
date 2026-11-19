import type { MetadataRoute } from "next";

// Lets the dashboard be added to a phone's home screen and receive push notifications.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Callsign",
    short_name: "Callsign",
    description: "Answer your AI agents' questions and approvals.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
