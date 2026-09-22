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
      href: "/operate",
      label: "Open guided version in Planning",
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
      title: "Quarterly Capital Posture Memo Example",
      description:
        "Forward-ready memo example for board updates on posture, risk classes, and reversal trigger logic.",
      path: "/resources/quarterly-capital-posture-memo-example",
      imageAlt: "Quarterly capital posture memo example",
      imageParams: { template: "guides", title: "Quarterly Capital Posture Memo Example" },
    },
    /* Worked, not blank. This was 310 bytes of empty headings — the same
       skeleton as the template beside it — while the word "example" is the
       whole of what it promises a reader who already has the template. It is a
       filled quarter now, labelled illustrative at the top of the file and
       here, because a memo with real-looking figures and no such label is a
       live claim that goes stale the week after it ships. */
    heroDescription:
      "A worked quarter — posture, decisions, triggers and board asks, filled in — so you can see the format carrying real content before you write your own.",
    heroItems: [
      "One-sentence posture call with the reading behind it",
      "SAFE / RISKY / DANGEROUS decisions classified by reversibility, not size",
      "Three reversal triggers, each with a number, a duration, an owner and a consequence",
      "Board approvals and guardrails requested",
      "Illustrative figures throughout — not a published reading. The live call is on the home page.",
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
