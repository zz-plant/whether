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
    detail: "Start with Action, Guardrail, and Flip condition, then use posture and regime-score context to pressure-test the call.",
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
  { text: "Top fold leads with Action + Guardrail + Flip condition for fast operating decisions." },
  { text: "Confidence and trend indicate pacing quality before score context." },
  { text: "Startup Climate Index remains available as contextual continuity metadata." },
];

export const FIRST_TIME_GUIDE_NEXT_LINKS: ReportLinkCopy[] = [
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "/operations#ops-playbook", label: "Planning" },
  { href: "/signals?advanced=1#time-machine", label: "Time machine" },
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
      { emphasis: "Start with current environment", detail: "to anchor this week's posture." },
      { emphasis: "Translate terms into constraints", detail: "before discussing bets." },
      { emphasis: "Use linked sections", detail: "to pull supporting evidence fast." },
    ],
  },
  {
    title: "Reading notes",
    bullets: [
      { emphasis: "Posture badge", detail: "summarizes current operating posture." },
      { emphasis: "Evidence maps to constraints", detail: "rather than forecasts." },
      { emphasis: "Exports support alignment", detail: "across teams." },
    ],
  },
];

export const SIGNALS_RELATED_LINKS: Array<Required<ReportLinkCopy>> = [
  {
    href: "/operations",
    label: "Planning",
    description: "Apply these diagnostics in guardrails, sequencing, and execution trade-offs.",
  },
  {
    href: "/method",
    label: "Trust",
    description: "Inspect trust status, source coverage, and formula references for each signal.",
  },
  {
    href: "/method#beginner-glossary",
    label: "Trust & glossary",
    description: "Open trust details and plain-English definitions for teams that need term translation.",
  },
];

export const ONBOARDING_RELATED_LINKS: Array<Required<ReportLinkCopy>> = [
  {
    href: "/",
    label: "Weekly Brief",
    description: "Use the canonical live weekly call before opening deeper evidence or execution paths.",
  },
  {
    href: "/operations",
    label: "Planning",
    description: "Turn the regime readout into concrete posture and execution guidance.",
  },
  {
    href: "/method#beginner-glossary",
    label: "Trust & glossary",
    description: "Review trust status, confidence limits, and the plain-English glossary in one place.",
  },
];
