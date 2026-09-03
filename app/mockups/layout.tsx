import type { ReactNode } from "react";
import { notFound } from "next/navigation";

/**
 * `/mockups/*` is design scratch — concept screens and visual experiments that
 * are not the product. The pages already set `robots: { index: false }`, but a
 * noindex page is still a served page: every route under here was publicly
 * reachable in production, so anyone with the URL got an unfinished screen
 * carrying the product's own chrome.
 *
 * Gated here rather than per page because two of the four are client
 * components, and a server layout is the one place that covers the whole
 * subtree regardless. Follows the trial-switch convention in wrangler.toml —
 * the preview lane sets the flag, production leaves it unset — so designers
 * keep the routes on preview deploys and in local dev.
 */
const mockupsEnabled = () =>
  process.env.NODE_ENV !== "production" || process.env.WHETHER_ENABLE_MOCKUPS === "1";

export default function MockupsLayout({ children }: { children: ReactNode }) {
  if (!mockupsEnabled()) {
    notFound();
  }

  return <>{children}</>;
}
