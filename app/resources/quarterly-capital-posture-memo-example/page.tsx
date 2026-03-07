import type { Metadata } from "next";
import {
  buildDownloadableResourceMetadata,
  DownloadableResourcePage,
  type DownloadableResourcePageConfig,
} from "../components/downloadableResourcePage";

const pageConfig: DownloadableResourcePageConfig = {
  metadata: {
    title: "Quarterly Capital Posture Memo Example",
    description:
      "Forward-ready memo example for board updates on posture, risk classes, and reversal trigger logic.",
    path: "/resources/quarterly-capital-posture-memo-example",
    imageAlt: "Quarterly capital posture memo example",
    imageParams: { template: "guides", title: "Quarterly Capital Posture Memo Example" },
  },
  heroDescription:
    "A concise board document format you can copy for quarterly operating reviews.",
  heroItems: [
    "One-sentence posture call",
    "SAFE / RISKY / DANGEROUS decisions this quarter",
    "Trigger outcomes and reversal plans",
    "Requested board approvals",
  ],
  downloadCta: {
    href: "/downloads/quarterly-capital-posture-memo-example.md",
    label: "Download memo artifact",
    conversionEvent: "download",
  },
  secondaryCta: {
    href: "/resources/capital-posture-template",
    label: "Open template",
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

export default function QuarterlyMemoExamplePage() {
  return <DownloadableResourcePage config={pageConfig} />;
}
