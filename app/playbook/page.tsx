import type { Metadata } from "next";
import { LegacyRouteBridge } from "../components/legacyRouteBridge";

export const metadata: Metadata = {
  title: "Playbook moved — Whether",
  description:
    "This legacy route has moved. Continue to Operations for the active action playbook.",
};

export default function PlaybookLegacyPage() {
  return (
    <LegacyRouteBridge
      eyebrow="Legacy route"
      title="Playbook moved to Operations"
      description="The action playbook now lives in Operations so execution guardrails and exports stay synchronized."
      primaryHref="/operations"
      primaryLabel="Open operations playbook"
      secondaryHref="/signals"
      secondaryLabel="Review evidence"
    />
  );
}
