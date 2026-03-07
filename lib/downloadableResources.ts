import type { DownloadableResourcePageConfig } from "../app/resources/components/downloadableResourcePage";

export const downloadableResources = {
  "capital-posture-template": {
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
  },
  "reversal-trigger-checklist": {
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
  },
  "quarterly-capital-posture-memo-example": {
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
  },
} satisfies Record<string, DownloadableResourcePageConfig>;

export type DownloadableResourceSlug = keyof typeof downloadableResources;

export const downloadableResourceSlugs = Object.keys(downloadableResources) as DownloadableResourceSlug[];

export const findDownloadableResourceBySlug = (slug: string): DownloadableResourcePageConfig | null =>
  downloadableResources[slug as DownloadableResourceSlug] ?? null;
