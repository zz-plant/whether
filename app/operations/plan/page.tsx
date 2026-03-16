import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { LegacyRouteBridge } from "../../components/legacyRouteBridge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Planning route moved",
  description:
    "Bridge page for the legacy planning route with direct next steps into Operations and the data companion.",
  path: "/operations/plan",
  imageAlt: "Whether planning route bridge",
});

export default function OperationsPlanPage() {
  return (
    <LegacyRouteBridge
      eyebrow="Planning route update"
      title="Planning has moved to Operations"
      description="You're on an older planning link. Continue to Operations to plan execution, or open the weekly data companion for the latest signal details."
      primaryHref="/operations"
      primaryLabel="Go to Operations"
      secondaryHref="/operations/data"
      secondaryLabel="Go to weekly data companion"
    />
  );
}
