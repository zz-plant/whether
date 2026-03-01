import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { LegacyRouteBridge } from "../../components/legacyRouteBridge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Planning route moved",
  description:
    "Bridge page for the legacy planning route with direct next steps into the action playbook and data companion.",
  path: "/operations/plan",
  imageAlt: "Whether planning route bridge",
});

export default function OperationsPlanPage() {
  return (
    <LegacyRouteBridge
      eyebrow="Planning route update"
      title="The planning flow now lives in Action playbook"
      description="You followed a legacy planning link. We kept this bridge so you can continue without losing context. Use the primary path for execution planning, or the secondary path for weekly data access."
      primaryHref="/operations"
      primaryLabel="Open action playbook"
      secondaryHref="/operations/data"
      secondaryLabel="Open weekly data companion"
    />
  );
}
