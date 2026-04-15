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

export const PRIMARY_AUDIENCE_LABEL = "U.S. market baseline";
export const PRIMARY_AUDIENCE_SUMMARY =
  "Whether defaults to a U.S. market baseline and uses U.S. Treasury, inflation, labor, credit, and funding signals as the starting point.";
export const PRIMARY_AUDIENCE_ACTION =
  "Use that baseline to set this week's pace, then pressure-test the recommendation against your own pipeline, retention, and cash data before you commit.";
export const PRIMARY_AUDIENCE_SHARE_GUIDANCE =
  "Leadership update is the default for U.S. leadership teams. Switch to the plain-English update when someone needs the market terms translated.";

export const FIRST_TIME_GUIDE_STEPS: FirstTimeGuideStep[] = [
  {
    label: "Summary",
    detail:
      "Start with the recommendation, the stop line, and the recovery line. The brief already assumes a U.S. market baseline, so align on the recommended posture first before debating edge cases.",
    example: "Example decision: defer expansion hires when cash is tight.",
  },
  {
    label: "Proof",
    detail:
      "Open the evidence view only if someone asks why the U.S. market read changed or what the key watch lines are.",
    example: "Example decision: confirm curve inversion before approving long bets.",
  },
  {
    label: "Actions",
    detail:
      "Use the planning page to turn the weekly recommendation into clear company-specific do, don't, and limit rules for the week.",
    example: "Example decision: focus on retention when risk appetite is cautious.",
  },
];

export const FIRST_TIME_GUIDE_HIGHLIGHTS: HighlightBullet[] = [
  { text: "Top fold leads with Action now + Pause if + Change course if for fast operating decisions." },
  { text: "The weekly brief defaults to a U.S. market baseline so teams do not have to translate the data source before using it." },
  { text: "Confidence and trend indicate pacing quality before score context." },
  { text: "Historical context is available, but the current decision stays primary." },
];

export const FIRST_TIME_GUIDE_NEXT_LINKS: ReportLinkCopy[] = [
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "/operations#ops-playbook", label: "Planning" },
  { href: "/signals?advanced=1#time-machine", label: "Past snapshots" },
];

export const BEGINNER_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    value: "tightness",
    term: "Cash availability",
    summary:
      "How hard it is for a U.S.-based company to access funding. Higher tightness means conserve cash and focus on runway.",
    why: "Why it matters: tighter U.S. capital markets make long-payback projects riskier.",
    usedInLabel: "Executive snapshot",
    usedInHref: "#executive-snapshot",
  },
  {
    value: "risk-appetite",
    term: "Market risk appetite",
    summary:
      "How willing U.S. investors and buyers are to take risk. Lower appetite means de-risk launches and hiring.",
    why: "Why it matters: U.S. market appetite sets how bold your roadmap can be this week.",
    usedInLabel: "Signal matrix",
    usedInHref: "#signal-matrix",
  },
  {
    value: "curve-slope",
    term: "Curve slope (recession risk)",
    summary: "A read on U.S. recession risk. Inversion signals caution and favors defensive planning.",
    why: "Why it matters: an inverted U.S. yield curve warns against long-horizon bets.",
    usedInLabel: "Executive snapshot",
    usedInHref: "#executive-snapshot",
  },
  {
    value: "fallback-mode",
    term: "Saved-data mode",
    summary: "When live data is unavailable, the report uses the latest cached Treasury snapshot.",
    why: "Why it matters: stale U.S. market inputs can mislead time-sensitive decisions.",
    usedInLabel: "Executive snapshot",
    usedInHref: "#executive-snapshot",
  },
];

export const GLOSSARY_USAGE_NOTES: GlossaryUsageNote[] = [
  {
    title: "How to use this glossary",
    bullets: [
      { emphasis: "U.S. market baseline", detail: "anchors this week's recommendation before company-specific judgment kicks in." },
      { emphasis: "Terms become constraints", detail: "for discussing bets." },
      { emphasis: "Linked sections", detail: "provide supporting evidence quickly." },
    ],
  },
  {
    title: "Reading notes",
    bullets: [
      { emphasis: "Current environment label", detail: "summarizes the U.S. backdrop for this week's decision." },
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
    description: "Open trust details and plain-English definitions for teams that need U.S. market term translation.",
  },
];

export const ONBOARDING_RELATED_LINKS: Array<Required<ReportLinkCopy>> = [
  {
    href: "/",
    label: "Weekly Brief",
    description: "Use the live weekly recommendation before opening deeper evidence or execution paths.",
  },
  {
    href: "/operations",
    label: "Planning",
    description: "Turn the current market backdrop into concrete execution guidance.",
  },
  {
    href: "/method#beginner-glossary",
    label: "Trust & glossary",
    description: "Review trust status, confidence limits, and the plain-English U.S. market glossary in one place.",
  },
];
