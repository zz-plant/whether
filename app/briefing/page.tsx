import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Briefing moved",
  description:
    "Bridge page for legacy weekly briefing links; continue to the canonical Weekly Brief or Operations.",
  path: "/briefing",
  imageAlt: "Whether Weekly Brief bridge",
});

export default function BriefingPage() {
  return (
    <LegacyRouteBridge
      eyebrow="Weekly brief route update"
      title="The Weekly Brief now lives on the homepage"
      description="You're on an older weekly briefing link. Continue to Weekly Brief for the canonical posture artifact, or jump to Operations for execution guardrails."
      primaryHref="/"
      primaryLabel="Go to Weekly Brief"
      secondaryHref="/operations"
      secondaryLabel="Go to Operations"
      autoForwardSeconds={3}
    />
  );
}
