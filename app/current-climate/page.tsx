import type { Metadata } from "next";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const metadata: Metadata = {
  title: "Current climate moved — Whether",
  description:
    "This legacy route has moved. Continue to the command center or the weekly briefing flow.",
};

export default function CurrentClimateLegacyPage() {
  return (
    <LegacyRouteBridge
      eyebrow="Legacy route"
      title="Current climate moved to the Command Center"
      description="This page is now part of the weekly command flow. Continue with the canonical route so posture, confidence, and exports stay in one place."
      primaryHref="/start"
      primaryLabel="Continue to command center"
      secondaryHref="/"
      secondaryLabel="Open weekly briefing"
    />
  );
}
