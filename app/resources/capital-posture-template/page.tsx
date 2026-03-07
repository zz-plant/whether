import type { Metadata } from "next";
import {
  buildDownloadableResourceMetadata,
  DownloadableResourcePage,
  type DownloadableResourcePageConfig,
} from "../components/downloadableResourcePage";

const pageConfig: DownloadableResourcePageConfig = {
  metadata: {
    title: "Capital Posture Template",
    description:
      "Board-ready capital posture template with SAFE/RISKY/DANGEROUS classifications and reversal trigger fields.",
    path: "/resources/capital-posture-template",
    imageAlt: "Capital posture template",
    imageParams: { template: "guides", title: "Capital Posture Template" },
  },
  heroDescription:
    "Use this skimmable template for weekly leadership syncs and monthly board packets.",
  heroItems: [
    "Posture call + confidence + timestamp",
    "SAFE / RISKY / DANGEROUS decision map",
    "Reversal triggers with owners and escalation windows",
  ],
  downloadCta: {
    href: "/downloads/capital-posture-template.md",
    label: "Download template artifact",
    conversionEvent: "download",
  },
  secondaryCta: {
    href: "/start?intent=capital-posture-template-gated",
    label: "Get guided version (Decision Shield)",
    conversionEvent: "download",
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
  printModeClassNames: {
    heroPanel: "print:border print:border-slate-300 print:bg-white",
    title: "print:text-slate-900",
    description: "print:text-slate-700",
    list: "print:text-slate-700",
    ctaRow: "print:hidden",
  },
};

export const metadata: Metadata = buildDownloadableResourceMetadata(pageConfig.metadata);

export default function CapitalPostureTemplatePage() {
  return <DownloadableResourcePage config={pageConfig} />;
}
