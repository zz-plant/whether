export type ReportLinkCopy = {
  href: string;
  label: string;
  description?: string;
};

export type FirstTimeGuideStep = {
  label: string;
  detail: string;
  example: string;
};

export type GlossaryEntry = {
  value: string;
  term: string;
  summary: string;
  why: string;
  usedInLabel: string;
  usedInHref: string;
};

export type GlossaryUsageNote = {
  title: string;
  bullets: Array<{ emphasis: string; detail: string }>;
};

export type HighlightBullet = { text: string };

export const FIRST_TIME_GUIDE_STEPS: FirstTimeGuideStep[] = [
  {
    label: "Summary",
    detail: "Confirm the weekly posture and top constraints before you open deeper diagnostics.",
    example: "Example decision: defer expansion hires when cash is tight.",
  },
  {
    label: "Proof",
    detail: "Use the signal breakdown here, then open the data lane to see the source metrics.",
    example: "Example decision: confirm curve inversion before approving long bets.",
  },
  {
    label: "Actions",
    detail: "Use the actions lane to brief leadership with clear, plain-English constraints.",
    example: "Example decision: focus on retention when risk appetite is cautious.",
  },
];

export const FIRST_TIME_GUIDE_HIGHLIGHTS: HighlightBullet[] = [
  { text: "Climate badge and weekly action summary." },
  { text: "Source freshness and capture timestamp." },
  { text: "Playbook links for constraint and action context." },
];

export const FIRST_TIME_GUIDE_NEXT_LINKS: ReportLinkCopy[] = [
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "/operations#ops-playbook", label: "Actions playbook" },
  { href: "/evidence#time-machine", label: "Time machine" },
];

export const BEGINNER_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    value: "tightness",
    term: "Cash availability (tightness)",
    summary:
      "How hard it is to access funding. Higher tightness means conserve cash and focus on runway.",
    why: "Why it matters: tight capital makes long payback projects riskier.",
    usedInLabel: "Executive snapshot",
    usedInHref: "#executive-snapshot",
  },
  {
    value: "risk-appetite",
    term: "Market risk appetite",
    summary:
      "How willing the market is to take risk. Lower appetite means de-risk launches and hiring.",
    why: "Why it matters: risk appetite sets how bold your roadmap can be.",
    usedInLabel: "Signal matrix",
    usedInHref: "#signal-matrix",
  },
  {
    value: "curve-slope",
    term: "Curve slope (recession risk)",
    summary: "A read on recession risk. Inversion signals caution and favors defensive planning.",
    why: "Why it matters: an inverted curve warns against long-horizon bets.",
    usedInLabel: "Executive snapshot",
    usedInHref: "#executive-snapshot",
  },
  {
    value: "fallback-mode",
    term: "Fallback mode",
    summary: "When live data is unavailable, the report uses the latest cached Treasury snapshot.",
    why: "Why it matters: stale inputs can mislead time-sensitive decisions.",
    usedInLabel: "Executive snapshot",
    usedInHref: "#executive-snapshot",
  },
];

export const GLOSSARY_USAGE_NOTES: GlossaryUsageNote[] = [
  {
    title: "How to use this glossary",
    bullets: [
      { emphasis: "Start with current climate", detail: "to anchor this week's stance." },
      { emphasis: "Translate terms into constraints", detail: "before discussing bets." },
      { emphasis: "Use linked sections", detail: "to pull supporting evidence fast." },
    ],
  },
  {
    title: "Reading notes",
    bullets: [
      { emphasis: "Climate badge", detail: "summarizes current macro stance." },
      { emphasis: "Signals map to constraints", detail: "rather than forecasts." },
      { emphasis: "Exports support alignment", detail: "across teams." },
    ],
  },
];

export const SIGNALS_RELATED_LINKS: Array<Required<ReportLinkCopy>> = [
  {
    href: "/operations",
    label: "Operations playbook",
    description: "Apply these diagnostics in guardrails, sequencing, and execution trade-offs.",
  },
  {
    href: "/methodology",
    label: "Methodology",
    description: "Inspect formula definitions and source documentation for each signal.",
  },
  {
    href: "/onboarding",
    label: "Onboarding & glossary",
    description: "Share plain-English definitions with teams new to macro-driven planning.",
  },
];

export const ONBOARDING_RELATED_LINKS: Array<Required<ReportLinkCopy>> = [
  {
    href: "/evidence",
    label: "Signal evidence",
    description: "Apply the glossary with live source data and threshold diagnostics.",
  },
  {
    href: "/operations",
    label: "Action playbook",
    description: "Turn the regime readout into concrete execution guidance.",
  },
  {
    href: "/methodology",
    label: "Methodology",
    description: "Explore the exact formula logic and original data providers.",
  },
];
