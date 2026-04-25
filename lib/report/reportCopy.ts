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
      "How hard or easy it is for U.S. companies to access funding right now. Higher tightness means conserve cash and extend runway.",
    why: "Why it matters: tighter U.S. capital markets make long-payback projects riskier and fundraising harder.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "risk-appetite",
    term: "Market risk appetite",
    summary:
      "How willing U.S. investors and buyers are to take risk on new products, hires, and growth bets.",
    why: "Why it matters: market appetite sets how bold your roadmap and hiring plan can be this week.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "curve-slope",
    term: "Recession warning gauge",
    summary: "A U.S. Treasury market signal that historically warns of recession. Inversion signals caution.",
    why: "Why it matters: an inverted yield curve warns against long-horizon bets and favors defensive planning.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "base-rate",
    term: "Fed interest rate",
    summary: "The baseline cost of money set by the Federal Reserve. Higher means borrowing costs more.",
    why: "Why it matters: the base rate affects your cost of capital, burn planning, and debt decisions.",
    usedInLabel: "Signal diagnostics",
    usedInHref: "/signals",
  },
  {
    value: "regime",
    term: "Operating environment (regime)",
    summary: "Whether identifies 4 environments: Defend, Conserve, Guarded Expand, and Expand. Each maps to a specific set of do/avoid rules.",
    why: "Why it matters: your operating environment determines the pacing rule for every decision this week.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "flip-condition",
    term: "Flip condition (change-course trigger)",
    summary: "The specific threshold that, if crossed, would change this week's recommendation. Always includes a reversal rule: what to do when conditions flip back.",
    why: "Why it matters: knowing what would change the call prevents overreaction and grounds decisions in data.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "guardrail",
    term: "Guardrail (pause trigger)",
    summary: "A boundary condition that tells you when to pause or slow down current plans. Less severe than a full flip.",
    why: "Why it matters: guardrails let you operate with confidence without constant re-litigation.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "confidence",
    term: "Signal confidence",
    summary: "How reliable this week's signal data is—rated HIGH, MED, or LOW. Low confidence means act with caution.",
    why: "Why it matters: confidence tells you whether to treat this week's read as a commitment or a watch item.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "bounded-decision",
    term: "Bounded decision rule",
    summary: "A decision with a clear action, a threshold to pause, and a condition to reverse. Unlike generic advice, it tells you exactly when to stop and go.",
    why: "Why it matters: bounded rules remove ambiguity—you know what to do, what to watch, and when to change.",
    usedInLabel: "Planning page",
    usedInHref: "/operations",
  },
  {
    value: "fallback-mode",
    term: "Saved-data mode",
    summary: "When live data is unavailable, the report uses the latest cached Treasury snapshot with a warning.",
    why: "Why it matters: stale U.S. market inputs can mislead time-sensitive decisions—check the trust badge.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "trend",
    term: "Signal trend",
    summary: "Which direction the signals are moving—improving, deteriorating, stable, or mixed. Trend tells you whether conditions are getting better or worse.",
    why: "Why it matters: trend adds context beyond a single score. Improving conditions may support staged expansion even in a cautious environment.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "posture",
    term: "Operating stance (posture)",
    summary: "The overall recommendation for how aggressively to operate this week, derived from signal scores and thresholds.",
    why: "Why it matters: your posture tells you whether to tighten, loosen, or hold—before you debate any specific initiative.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
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
