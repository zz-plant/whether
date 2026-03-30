import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Whether",
    short_name: "Whether",
    description: "Weekly operating brief for turning macro signals into clear decisions.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
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
        name: "Planning",
        short_name: "Planning",
        description: "Open approvals, guardrails, and operating levers.",
        url: "/operations",
      },
      {
        name: "Evidence",
        short_name: "Evidence",
        description: "Open the driver stack and thresholds.",
        url: "/signals",
      },
    ],
  };
}
