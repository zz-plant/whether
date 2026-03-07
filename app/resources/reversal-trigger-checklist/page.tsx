import type { Metadata } from "next";
import {
  buildDownloadableResourceMetadata,
  DownloadableResourcePage,
  type DownloadableResourcePageConfig,
} from "../components/downloadableResourcePage";

const pageConfig: DownloadableResourcePageConfig = {
  metadata: {
    title: "Reversal Trigger Checklist",
    description:
      "A short checklist to define, monitor, and escalate reversal triggers for board-visible capital decisions.",
    path: "/resources/reversal-trigger-checklist",
    imageAlt: "Reversal trigger checklist",
    imageParams: { template: "guides", title: "Reversal Trigger Checklist" },
  },
  heroDescription: "Use before approving any RISKY commitment.",
  heroItems: [
    "Define threshold value and breach duration.",
    "Name owner + escalation recipient.",
    "Document rollback path and execution window.",
    "Confirm data source quality and update cadence.",
    "Add board notification trigger language.",
  ],
  heroItemsOrdered: true,
  downloadCta: {
    href: "/downloads/reversal-trigger-checklist.md",
    label: "Download checklist artifact",
    conversionEvent: "download",
  },
  secondaryCta: {
    href: "/resources/decision-shield-overview",
    label: "Apply in Decision Shield",
    conversionEvent: "request",
  },
  internalLinks: [
    {
      href: "/resources/capital-discipline-venture-backed-companies",
      label: "Canonical pillar: Capital Discipline",
    },
    {
      href: "/resources/board-level-capital-posture-framework",
      label: "Board Framework page",
    },
  ],
};

export const metadata: Metadata = buildDownloadableResourceMetadata(pageConfig.metadata);

export default function ReversalTriggerChecklistPage() {
  return <DownloadableResourcePage config={pageConfig} />;
}
