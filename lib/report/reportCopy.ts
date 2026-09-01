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

/** Plain-language copy for the homepage's scan-first bounded-decision ledger. */
export const ACTION_STRIP_DISPLAY_COPY = {
  heading: "What can we do this week?",
  action: "Do now",
  threshold: "Stop or tighten if",
  reversal: "Open up again when",
  state: {
    Closed: "Keep this closed",
    Guarded: "Proceed with guardrails",
    Staged: "Stage the next move",
    Open: "Move ahead now",
  },
} as const;

/**
 * A flat week is the common case and a useful answer in itself: it means the
 * standing calls survive another week. State the consequence rather than
 * repeating the delta, which the score block already carries.
 */
export const STEADY_WEEK_LABEL = "No change";
export const STEADY_WEEK_CONSEQUENCE = "Last week's calls stand.";

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
  { href: "/operate#ops-playbook", label: "Planning" },
  { href: "/signals?advanced=1#time-machine", label: "Past snapshots" },
];

export const BEGINNER_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    value: "tightness",
    term: "Funding pressure",
    summary:
      "How hard or easy it is for U.S. companies to access funding. A higher score means conserving cash and extending runway.",
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
    usedInHref: "/signals",
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
    usedInHref: "/operate",
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
    usedInHref: "/signals",
  },
  {
    value: "stop-line",
    term: "Stop line (guardrail trigger)",
    summary: "A specific threshold that, if crossed, pauses a category of decisions (hiring, spending, long-term commitments) until conditions improve.",
    why: "Why it matters: stop lines let you operate without constant re-litigation—you know the exact boundary where you shift to caution.",
    usedInLabel: "Planning page",
    usedInHref: "/operate",
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
    summary: "The inverse of funding pressure: how much room you have to hire, spend, and make long-term commitments. Calculated as (risk appetite × 0.7) + (100 − funding pressure) × 0.3.",
    why: "Why it matters: boldness tells you how aggressively you can operate at a glance—higher budget means more expansion room, lower means conserve.",
    usedInLabel: "Weekly brief",
    usedInHref: "/",
  },
  // Market-mechanics terms. Everything above names something Whether invented;
  // everything below names something the bond market invented and the charts on
  // /signals and the formulas on /trust use without translating.
  {
    value: "yield-curve",
    term: "Yield curve",
    summary:
      "The set of interest rates the U.S. government pays to borrow for different lengths of time — one month, three months, two years, ten years.",
    why: "Why it matters: the shape of that set is the cheapest available read on whether lenders expect growth or a slowdown.",
    usedInLabel: "Signal diagnostics",
    usedInHref: "/signals",
  },
  {
    value: "treasury-maturities",
    term: "1M, 3M, 2Y, 10Y",
    summary:
      "Shorthand for how long the government is borrowing for: one month, three months, two years, ten years. Charts label the lines this way.",
    why: "Why it matters: short maturities track what the Fed is doing now; long ones track what the market expects later.",
    usedInLabel: "Signal diagnostics",
    usedInHref: "/signals",
  },
  {
    value: "spread",
    term: "Spread",
    summary:
      "One rate minus another. \"10Y-2Y\" is the ten-year rate minus the two-year rate; a spread of +1.2% means long borrowing costs 1.2 points more than short.",
    why: "Why it matters: the gap, not either rate on its own, is what carries the signal.",
    usedInLabel: "Signal diagnostics",
    usedInHref: "/signals",
  },
  {
    value: "inversion",
    term: "Inversion (negative spread)",
    summary:
      "When a spread drops below zero — short-term borrowing costs more than long-term. On the charts, any line below the zero line is inverted.",
    why: "Why it matters: inversion has preceded most U.S. recessions, so it argues for short-payback projects over multi-year bets.",
    usedInLabel: "Signal diagnostics",
    usedInHref: "/signals",
  },
  {
    value: "basis-point",
    term: "Basis point (bp)",
    summary: "One hundredth of a percentage point. A move from 4.10% to 4.35% is 25 bp.",
    why: "Why it matters: weekly rate moves are small in percent terms, so the charts measure them in basis points to stay readable.",
    usedInLabel: "Signal diagnostics",
    usedInHref: "/signals",
  },
  {
    value: "credit-spread",
    term: "High-yield credit spread",
    summary:
      "The extra interest riskier companies pay to borrow, over what the government pays. Widens when lenders get nervous.",
    why: "Why it matters: it is the closest public proxy for how expensive risk capital has become for companies like yours.",
    usedInLabel: "Formula reference",
    usedInHref: "/trust#formula-reference",
  },
  {
    value: "vix",
    term: "VIX",
    summary:
      "A market-wide index of how much stock-price turbulence traders expect over the next month. Higher means more expected turbulence.",
    why: "Why it matters: sustained high readings mean investors are protecting themselves, which shows up as slower funding decisions.",
    usedInLabel: "Formula reference",
    usedInHref: "/trust#formula-reference",
  },
  {
    value: "financial-conditions-index",
    term: "Chicago Fed financial conditions index",
    summary:
      "A Federal Reserve summary of how easy or hard overall borrowing conditions are. Zero is average; above zero is tighter than average.",
    why: "Why it matters: it catches funding stress that shows up outside the Treasury market.",
    usedInLabel: "Formula reference",
    usedInHref: "/trust#formula-reference",
  },
  {
    value: "fred-series",
    term: "FRED series codes (DFF, DGS2, DGS10)",
    summary:
      "FRED is the Federal Reserve's free public data service. Each code names one published series — DFF is the Fed's policy rate, DGS2 the two-year Treasury rate, DGS10 the ten-year.",
    why: "Why it matters: the codes are what make the score auditable — anyone can pull the same series and recompute it.",
    usedInLabel: "Formula reference",
    usedInHref: "/trust#formula-reference",
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
    href: "/operate",
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
    href: "/operate",
    label: "Planning",
    description: "Turn the current market backdrop into concrete execution guidance.",
  },
  {
    href: "/trust#beginner-glossary",
    label: "Trust & glossary",
    description: "Review trust status, confidence limits, and the plain-English U.S. market glossary in one place.",
  },
];
