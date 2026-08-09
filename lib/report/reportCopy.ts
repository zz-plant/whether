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

// Single vocabulary for the bounded-decision contract (action / threshold /
// reversal). UI surfaces read the imperative forms (Do now, Pause if, Change
// course if); exports and metadata use the noun slots (Action, Threshold,
// Reversal). Consume these instead of hardcoding slot labels in components.
export const DECISION_CONTRACT_LABELS = {
  slot: {
    action: "Action",
    threshold: "Threshold",
    reversal: "Reversal",
  },
  action: {
    doNow: "Do now",
    actionNow: "Action now",
  },
  threshold: {
    guardrail: "Guardrail",
    trigger: "Trigger",
    pauseIf: "Pause if",
  },
  reversal: {
    reversal: "Reversal",
    changeCourseIf: "Change course if",
    clearsWhen: "Clears when",
  },
  watch: {
    flipWatch: "Flip watch",
    watchThisWeek: "Watch this week",
    watchNext: "Watch next",
  },
} as const;

export const PRIMARY_AUDIENCE_LABEL = "U.S. market starting point";
export const PRIMARY_AUDIENCE_SUMMARY =
  "Whether is decision-support software, not an authority. This brief starts from U.S. rates, inflation, labor, credit, and funding conditions.";
export const PRIMARY_AUDIENCE_ACTION =
  "Before you commit, pressure-test that read against your own demand, retention, and cash signals. Do not use this as the sole basis for irreversible hiring, fundraising, budget, or investment decisions.";
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
    example: "Example decision: check the recession warning gauge before approving long-payback projects.",
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
  { text: "Confidence and trend tell you how reliable this week's read is before you dig into the score details." },
  { text: "Historical context is available, but the current decision takes priority." },
];

export const FIRST_TIME_GUIDE_NEXT_LINKS: ReportLinkCopy[] = [
  { href: "#executive-snapshot", label: "Leadership summary" },
  { href: "/planning#ops-playbook", label: "Planning" },
  { href: "/evidence?advanced=1#time-machine", label: "Past snapshots" },
];

export const BEGINNER_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    value: "tightness",
    term: "Cash availability",
    summary:
      "How hard or easy it is for U.S. companies to access funding. Higher tightness means conserving cash and extending runway.",
    why: "Why it matters: tighter U.S. capital markets make long-payback projects riskier and fundraising harder.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "risk-appetite",
    term: "Risk appetite",
    summary:
      "How willing U.S. investors and buyers are to take risks on new products, hires, and growth bets.",
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
    usedInHref: "/evidence",
  },
  {
    value: "regime",
    term: "Current conditions (regime)",
    summary: "Whether identifies 4 conditions: Freezing, Cloudy, Stormy, and Sunny — each with a specific operating forecast.",
    why: "Why it matters: current conditions set the operating forecast for every decision this week.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "flip-condition",
    term: "Clears-when condition",
    summary: "The specific threshold that, if crossed, would change this week's forecast. Includes the recovery condition: what to do when conditions clear.",
    why: "Why it matters: knowing what would shift the forecast prevents overreaction and grounds decisions in data.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "guardrail",
    term: "Guardrail (pause trigger)",
    summary: "A boundary condition that tells you when to pause or slow down current plans. Less severe than a clears-when condition.",
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
    usedInHref: "/planning",
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
    why: "Why it matters: trend adds context beyond a single score. Improving conditions support staged expansion even in a cautious environment.",
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
  {
    value: "regime-types",
    term: "The 4 regimes",
    summary: "EXPANSION (credit available, investors optimistic—scale proven bets) · SCARCITY (credit tight, investors cautious—preserve cash) · DEFENSIVE (credit tight, investors willing to fund) · VOLATILE (credit available, investors cautious—conditions can shift quickly)",
    why: "Why it matters: each regime sets a different operating forecast. Know which one you're in to make trade-offs.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "signals-breakdown",
    term: "Treasury signals vs Macro signals",
    summary: "Treasury: forward-looking U.S. government bond market. Macro: employment, inflation, consumer spending. When they disagree, one is leading or markets aren't pricing something in.",
    why: "Why it matters: signal disagreement tells you which signal to trust more—usually the one supported by real-time company metrics.",
    usedInLabel: "Evidence view",
    usedInHref: "/evidence",
  },
  {
    value: "stop-line",
    term: "Stop line (guardrail trigger)",
    summary: "A specific threshold that, if crossed, pauses a category of decisions (hiring, spending, long-term commitments) until conditions improve.",
    why: "Why it matters: stop lines let you operate without constant re-litigation—you know the exact boundary where you shift to caution.",
    usedInLabel: "Planning page",
    usedInHref: "/planning",
  },
  {
    value: "cached-snapshot",
    term: "Cached snapshot (stale data mode)",
    summary: "When live data sources are temporarily unavailable, the report uses the last verified snapshot with a prominent warning. Safe for staged decisions, not for irreversible commitments.",
    why: "Why it matters: stale U.S. market data can mislead urgent spending or hiring decisions. Always check the freshness badge before committing.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  {
    value: "boldness-score",
    term: "Boldness budget",
    summary: "Inverse of tightness: how much room you have to hire, spend, and make long-term commitments. Calculated as (risk appetite × 0.7) + (100 - tightness) × 0.3.",
    why: "Why it matters: boldness tells you how aggressively you can operate at a glance—higher budget means more expansion room, lower means conserve.",
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
    href: "/planning",
    label: "Planning",
    description: "Use these diagnostics to set guardrails, prioritize work, and make trade-offs.",
  },
  {
    href: "/trust",
    label: "Trust",
    description: "Inspect trust status, source coverage, and formula references for each signal.",
  },
  {
    href: "/trust#beginner-glossary",
    label: "Trust & glossary",
    description: "Open trust details and plain-English definitions of U.S. market terms.",
  },
];

export const ONBOARDING_RELATED_LINKS: Array<Required<ReportLinkCopy>> = [
  {
    href: "/",
    label: "Weekly Brief",
    description: "Use the live weekly recommendation before opening deeper evidence or execution paths.",
  },
  {
    href: "/planning",
    label: "Planning",
    description: "Turn the current market backdrop into concrete execution guidance.",
  },
  {
    href: "/trust#beginner-glossary",
    label: "Trust & glossary",
    description: "Review trust status, confidence limits, and the plain-English U.S. market glossary in one place.",
  },
];
