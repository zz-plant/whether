import type { Metadata } from "next";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const metadata: Metadata = {
  title: "For teams moved — Whether",
  description:
    "This legacy route has moved. Continue to Decide for role-specific operating guidance.",
};

export default function ForTeamsLegacyPage() {
  return (
    <LegacyRouteBridge
      eyebrow="Legacy route"
      title="For Teams moved to Decide"
      description="Role-specific guidance now lives in Decide so team, function, and stage views stay aligned with the same weekly posture."
      primaryHref="/decide"
      primaryLabel="Open decide views"
      secondaryHref="/guides"
      secondaryLabel="Open stakeholder guides"
    />
  );
}
