import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Evidence route moved",
  description: "Bridge for legacy /evidence links with direct paths to signals and methodology trust surfaces.",
  path: "/evidence",
  imageAlt: "Whether evidence route bridge",
});

export default function EvidenceBridgePage() {
  return (
    <LegacyRouteBridge
      eyebrow="Legacy route bridge"
      title="Evidence is now organized across Signals and Methodology"
      description="You followed an older evidence link. Start with signal thresholds for proof of current posture, then review methodology for scoring and update cadence."
      primaryHref="/signals#thresholds"
      primaryLabel="Open signal thresholds"
      secondaryHref="/methodology"
      secondaryLabel="Open methodology"
    />
  );
}
