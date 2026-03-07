import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Start route moved",
  description:
    "Start routing is now compressed into the Weekly Brief and Action playbook. Use this bridge for legacy /start links.",
  path: "/start",
  imageAlt: "Whether start route bridge",
});

export default function StartHerePage() {
  return (
    <LegacyRouteBridge
      eyebrow="Legacy route bridge"
      title="Start routing now lives in Weekly Brief"
      description="Use Weekly Brief for the canonical posture call, then jump to Action playbook guardrails. This route remains only for legacy links."
      primaryHref="/"
      primaryLabel="Go to Weekly Brief"
      secondaryHref="/operations"
      secondaryLabel="Go to Action playbook"
      autoForwardSeconds={3}
    />
  );
}
