import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Briefing moved",
  description:
    "Bridge page for legacy weekly briefing links; continue to the canonical weekly brief or the action playbook.",
  path: "/briefing",
  imageAlt: "Whether weekly briefing bridge",
});

export default function BriefingPage() {
  return (
    <LegacyRouteBridge
      eyebrow="Weekly brief route update"
      title="The weekly briefing now lives on the homepage"
      description="You're on an older weekly briefing link. Continue to Weekly Brief for the canonical posture artifact, or jump to the Action playbook for execution guardrails."
      primaryHref="/"
      primaryLabel="Go to Weekly Brief"
      secondaryHref="/operations"
      secondaryLabel="Go to Action playbook"
      autoForwardSeconds={3}
    />
  );
}
