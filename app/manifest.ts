import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Whether",
    short_name: "Whether",
    description: "Weekly U.S. market brief for turning market signals into clear operating decisions.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f1316",
    theme_color: "#0f1316",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Weekly Brief",
        short_name: "Brief",
        description: "Open this week's operating brief.",
        url: "/",
      },
      {
        name: "Plan",
        short_name: "Plan",
        description: "Open approvals, guardrails, and operating levers.",
        url: "/operate",
      },
      {
        name: "Evidence",
        short_name: "Evidence",
        description: "Open the main drivers and thresholds.",
        url: "/signals",
      },
    ],
  };
}
