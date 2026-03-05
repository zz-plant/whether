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
      title="Planning has moved to the Action playbook"
      description="You're on an older planning link. Continue to the Action playbook to plan execution, or open the weekly data companion for the latest signal details."
      primaryHref="/operations"
      primaryLabel="Go to Action playbook"
      secondaryHref="/operations/data"
      secondaryLabel="Go to weekly data companion"
    />
  );
}
