import type { DownloadableResourcePageConfig } from "../app/resources/components/downloadableResourcePage";

export const downloadableResources = {
  "capital-posture-template": {
    metadata: {
      title: "Capital Planning Template",
      description:
        "Board-ready capital planning template with SAFE/RISKY/DANGEROUS classifications and pause line fields.",
      path: "/resources/capital-posture-template",
      imageAlt: "Capital planning template",
      imageParams: { template: "guides", title: "Capital Planning Template" },
    },
    heroDescription:
      "Use this skimmable template for weekly leadership syncs and monthly board packets.",
    heroItems: [
      "Guidance + margin + timestamp",
      "SAFE / RISKY / DANGEROUS decision map",
      "Pause lines with owners and escalation windows",
    ],
    downloadCta: {
      href: "/downloads/capital-posture-template.md",
      label: "Download template artifact",
      conversionEvent: "download",
    },
    secondaryCta: {
      href: "/operate",
      label: "Open the guided version in the plan",
      conversionEvent: "request",
    },
    internalLinks: [
      {
        href: "/resources/capital-discipline-venture-backed-companies",
        label: "Guide: capital discipline",
      },
      {
        href: "/resources/board-level-capital-posture-framework",
        label: "The board framework",
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
      title: "Pause Line Checklist",
      description:
        "A short checklist for the pause line on a capital decision the board will see: what number it sits at, how long a breach must last, who acts and how to roll back.",
      path: "/resources/reversal-trigger-checklist",
      imageAlt: "Pause line checklist",
      imageParams: { template: "guides", title: "Pause Line Checklist" },
    },
    heroDescription: "Use before approving any RISKY commitment.",
    heroItems: [
      "Set the pause line's value and how long a breach must last.",
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
        label: "Guide: capital discipline",
      },
      {
        href: "/resources/board-level-capital-posture-framework",
        label: "The board framework",
      },
    ],
  },
  "quarterly-capital-posture-memo-example": {
    metadata: {
      title: "Quarterly Capital Planning Memo Example",
      description:
        "Forward-ready memo example for board updates on capital conditions, risk classes, and pause line logic.",
      path: "/resources/quarterly-capital-posture-memo-example",
      imageAlt: "Quarterly capital planning memo example",
      imageParams: { template: "guides", title: "Quarterly Capital Planning Memo Example" },
    },
    /* Worked, not blank. This was 310 bytes of empty headings — the same
       skeleton as the template beside it — while the word "example" is the
       whole of what it promises a reader who already has the template. It is a
       filled quarter now, labelled illustrative at the top of the file and
       here, because a memo with real-looking figures and no such label is a
       live claim that goes stale the week after it ships. */
    heroDescription:
      "A worked quarter with guidance, decisions, pause lines and board asks filled in. It shows the format carrying real content before you write your own.",
    heroItems: [
      "One-sentence guidance with the reading behind it",
      "SAFE / RISKY / DANGEROUS decisions classified by reversibility, not size",
      "Three pause lines, each with a number, a duration, an owner and a consequence",
      "Board approvals and guardrails requested",
      "Illustrative figures throughout — not a published reading. The live guidance is on the home page.",
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
        label: "Guide: capital discipline",
      },
      {
        href: "/resources/board-level-capital-posture-framework",
        label: "The board framework",
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

type DownloadableResourceSlug = keyof typeof downloadableResources;

export const downloadableResourceSlugs = Object.keys(downloadableResources) as DownloadableResourceSlug[];

export const findDownloadableResourceBySlug = (slug: string): DownloadableResourcePageConfig | null =>
  downloadableResources[slug as DownloadableResourceSlug] ?? null;
