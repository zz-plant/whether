import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Archive — Historical Regime Records",
  description:
    "Historical record of US macro operating posture regimes, week by week. Scan past expansion, scarcity, and defensive regimes for pattern-aware decision making.",
  path: "/archive",
  imageAlt: "Whether historical regime archive",
});

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
