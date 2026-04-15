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

export const PRIMARY_AUDIENCE_LABEL = "U.S. market starting point";
export const PRIMARY_AUDIENCE_SUMMARY =
  "This brief starts from U.S. rates, inflation, labor, credit, and funding conditions.";
export const PRIMARY_AUDIENCE_ACTION =
  "Before you commit, pressure-test that read against your own demand, retention, and cash signals.";
export const PRIMARY_AUDIENCE_SHARE_GUIDANCE =
  "Start with the leadership team brief. Switch to the plain-English brief when the audience needs less shorthand.";

export const FIRST_TIME_GUIDE_STEPS: FirstTimeGuideStep[] = [
  {
    label: "Summary",
    detail:
      "Start with the main read, what to pause, and what would change it. The brief starts from a U.S. market view, so align on that first before debating edge cases.",
    example: "Example decision: defer expansion hires when cash is tight.",
  },
  {
    label: "Proof",
    detail:
      "Open the evidence view only if someone asks why the market view changed or which thresholds matter most.",
    example: "Example decision: confirm curve inversion before approving long bets.",
  },
  {
    label: "Actions",
    detail:
      "Use the planning page to turn the weekly read into clear company-specific do, don't, and limit rules for the week.",
    example: "Example decision: focus on retention when risk appetite is cautious.",
  },
];

export const FIRST_TIME_GUIDE_HIGHLIGHTS: HighlightBullet[] = [
  { text: "Top fold leads with Action now + Pause if + Change course if for fast operating decisions." },
  { text: "The weekly brief starts from a U.S. market read so teams can make a decision before debating edge cases." },
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
      { emphasis: "U.S. market starting point", detail: "anchors this week's read before company-specific judgment kicks in." },
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
