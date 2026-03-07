import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Plan route moved",
  description: "Bridge for legacy /plan links with direct routes to the current planning destinations.",
  path: "/plan",
  imageAlt: "Whether plan route bridge",
});

export default function PlanBridgePage() {
  return (
    <LegacyRouteBridge
      eyebrow="Legacy route bridge"
      title="Planning is now part of Action playbook"
      description="The previous /plan route has moved. Continue with the primary planning workflow, or jump to copy-ready brief exports for leadership updates."
      primaryHref="/operations"
      primaryLabel="Go to action playbook"
      secondaryHref="/operations#ops-export-briefs"
      secondaryLabel="Open export briefs"
      autoForwardSeconds={3}
    />
  );
}
