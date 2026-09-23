type ReportLinkCopy = {
  href: string;
  label: string;
  description?: string;
};

type FirstTimeGuideStep = {
  label: string;
  detail: string;
  example: string;
};

type TermDefinition = {
  value: string;
  term: string;
  summary: string;
};

type HighlightBullet = { text: string };

// Single vocabulary for the bounded-decision contract (action / threshold /
// reversal). UI surfaces read the imperative forms (Do now, Pause if, Resume
// when); exports and metadata use the noun slots (Action, Threshold,
// Reversal). Consume these instead of hardcoding slot labels in components.
//
// One name per line, and that is the whole point of the table.
//
// It used to offer two: `threshold.guardrail` beside `threshold.pauseIf`, and
// `reversal.clearsWhen` beside `reversal.changeCourseIf`. Invariant 8 stops a
// component spelling a label itself but cannot see that two entries name one
// thing, so the hero drew a rail labelled "Guardrail / Clears when" and
// `/operate` drew the same rail, off the same numbers, labelled "Pause if /
// Change course if". A reader crossing from the brief to the plan had to
// discover that four words were two.
//
// The imperative pair won because the rest of the product already taught it:
// `FIRST_TIME_GUIDE_HIGHLIGHTS` names "Action now + Pause if + Change course
// if", `/trust`'s framework explainer works the example in those words, and
// the glossary glosses the noun as "Guardrail (pause trigger)" — the synonym
// was always the second name for the imperative, never the other way round.
//
// "Change course if" then became "Resume when" (2026-09-22). The glossary had
// to spend three adjacent entries telling it apart from "Call changes if",
// because both read as "the call changes" — and the line it names does
// something narrower: it re-opens the decisions the pause line held. A name
// that says what happens needs no entry. `publicDecisionLabels.reversal`,
// which still said "Re-open when" on /brief, /decisions and every answer page,
// reads it now instead of spelling a third name.
/** The threshold slot when no rule supplied one. Was retyped in five modules. */
export const FALLBACK_PAUSE_THRESHOLD = "Pause if thresholds weaken";

/**
 * The one display name for the 0-100 composite scalar (`boldnessScore`:
 * risk appetite × 0.7 + (100 − funding pressure) × 0.3) that the brief
 * headlines. Every surface that names the score — the hero, the sticky call
 * strip, the glossary, exports, pricing copy, history compare — reads this
 * constant. Renamed from "Boldness Budget": the budget metaphor was memorable
 * but not immediately interpretable, and two names for one scalar let surfaces
 * drift into describing different verdicts.
 */
export const OPERATING_LATITUDE_LABEL = "Operating latitude";

/**
 * What the latitude number means, said wherever the number is. It was defined
 * only inside the hero's collapsed "Why this call" panel and on /glossary, so
 * the largest figure on the homepage arrived with no scale above the fold.
 */
export const OPERATING_LATITUDE_GLOSS = "room to hire, spend and commit; higher means more room";

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
    pauseIf: "Pause if",
  },
  reversal: {
    /**
     * Where a hold lifts: an area's resume line, and — when a stage is set —
     * that stage's discipline for lifting its hold (`WeeklyCallContract.resumeWhen`).
     * Never where the call itself changes; that is `watch.postureFlips`, and the
     * two print side by side, never one in place of the other.
     */
    resumeWhen: "Resume when",
  },
  watch: {
    flipWatch: "What would change this guidance",
    /**
     * The regime line, as distinct from a rule's pause line: where the call
     * itself changes.
     *
     * Three lines sit on one 0-100 axis — pause (76), change course (66) and
     * this one (70) — and until now only two of them were drawn. This one was
     * stated in prose under the rails as "Posture flips: funding pressure at or
     * below 70", while the rails themselves labelled it, where they drew it at
     * all, "Watch line". So the reader met a third threshold under a fourth
     * name, between two it had just learned.
     */
    postureFlips: "Conditions change if",
    watchThisWeek: "Watch this week",
    watchNext: "Watch next",
  },
  timing: {
    /** When acting this week is felt and what unwinding costs (decision latency). */
    latency: "Timing",
  },
} as const;

/**
 * The call when the policy engine refuses to support a posture change.
 *
 * Every horizon has to say the same thing here. The regime-derived guidance keeps
 * reading "scale proven bets" through a refusal, so a surface that renders it while
 * the weekly call says "slow approvals" puts two opposite instructions on one screen.
 * Both the weekly contract and the cadence lead read these.
 *
 * Written in the reader's terms: what is held and why. "Policy override" and
 * "policy signals" name the engine's mechanism, which a reader cannot act on.
 */
export const POLICY_OVERRIDE_CALL = {
  currentCall: "The two scores point in different directions, so the guidance is not changing this week.",
  actionNow: "Keep last week's plan. Hold anything you can't undo, and cap new experiments until the scores agree.",
  pauseIf: "Hold anything you can't undo while the two scores disagree.",
  callChangesIf:
    "The two scores point the same way for a second reading; until then the guidance is not changing.",
} as const;

/**
 * The call when no live reading produced one.
 *
 * A fallback sentence has to say what is missing and what to hold. "Hold bounded
 * operating discipline" said neither, and it was printed into Slack, email and
 * the meeting pack whenever the real call was absent — the page was least legible
 * exactly when the model was least sure. The weekly contract and the home brief
 * builder both read these so the two cannot drift.
 */
export const NO_LIVE_READING_CALL = {
  currentCall: "No live reading this week. Keep last week's plan.",
  pauseIf: "No pause line this week. Hold anything you can't undo; the rest can go ahead.",
  callChangesIf: "A live reading lands; until then the guidance is not changing.",
} as const;

export const PRIMARY_AUDIENCE_SUMMARY =
  "Whether is decision-support software, not an authority. This brief starts from U.S. rates, inflation, labor, credit, and funding conditions.";

/* Written to one reader. The earlier version assumed a room — "align on that
   first before debating edge cases", "only if someone asks why" — and the page
   knows nothing about who else is there. */
export const FIRST_TIME_GUIDE_STEPS: FirstTimeGuideStep[] = [
  {
    label: "Summary",
    detail:
      "Read the guidance first: what to do, what to pause, and what would change it. It starts from the U.S. market environment, not from your company.",
    example: "Example decision: defer expansion hires when cash is tight.",
  },
  {
    label: "Proof",
    detail:
      "Open the score details only if you want to know why the guidance changed or which line is closest.",
    example: "Example decision: check the recession warning gauge before approving a project that pays back slowly.",
  },
  {
    label: "Actions",
    detail:
      "Use the planning page to turn the guidance into this week's do, don't and limit rules.",
    example: "Example decision: focus on retention when risk appetite is cautious.",
  },
];

export const FIRST_TIME_GUIDE_HIGHLIGHTS: HighlightBullet[] = [
  {
    text: `The guidance is three lines: ${DECISION_CONTRACT_LABELS.action.actionNow}, ${DECISION_CONTRACT_LABELS.threshold.pauseIf}, ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}.`,
  },
  { text: "Your stage and runway, if you set them, change the notes under the guidance and nothing else." },
  { text: "Confidence says how far the scores sit from the line where conditions change." },
  { text: "Past weeks are one click away; this week's guidance comes first." },
];

export const FIRST_TIME_GUIDE_NEXT_LINKS: ReportLinkCopy[] = [
  /* Was `#executive-snapshot`, which no page renders. The guide had never been
     rendered either, so nobody could click it and find that out. */
  { href: "#weekly-call", label: "This week's guidance" },
  { href: "/operate#ops-playbook", label: "Planning" },
  { href: "/signals?advanced=1#time-machine", label: "Past snapshots" },
];

/**
 * Definitions for machine readers, not a page.
 *
 * These were the /glossary entries. The route is gone (2026-09-22): each term a
 * reader meets now carries its meaning where it appears — a score beside its
 * scale, a line under a name that says what it does — and the instrument names
 * only a formula needs are defined on the formula cards. What survives is the
 * block `llms-full.txt` prints, because an agent reading "funding pressure 77"
 * in a pasted brief has no page to look at.
 *
 * Seven entries did not survive: "posture", "bounded decision rule" and "signal
 * trend" named words the site stopped using; "Treasury signals vs Macro
 * signals" named a split no surface showed; "cached snapshot" was a second
 * entry for saved-data mode; the maturity shorthand and "basis point" are
 * defined by the chart key beside every chart that uses them.
 */
export const TERM_DEFINITIONS: readonly TermDefinition[] = [
  {
    value: "tightness",
    term: "Funding pressure",
    summary:
      "A 0-100 score for how hard it is for U.S. companies to raise or borrow money. Higher means harder: conserve cash and extend runway.",
  },
  {
    value: "risk-appetite",
    term: "Risk appetite",
    summary:
      "A 0-100 score for how willing U.S. investors and buyers are to fund new products, hires and growth bets. Higher means more willing.",
  },
  {
    value: "boldness-score",
    term: OPERATING_LATITUDE_LABEL,
    summary: `A 0-100 score: ${OPERATING_LATITUDE_GLOSS}. Weighted mostly toward risk appetite: (risk appetite × 0.7) + ((100 − funding pressure) × 0.3).`,
  },
  {
    value: "curve-slope",
    term: "Recession warning gauge",
    summary:
      "The ten-year Treasury rate minus the two-year rate. Below zero, short-term borrowing costs more than long-term, which has preceded most U.S. recessions.",
  },
  {
    value: "base-rate",
    term: "Short-term borrowing rate",
    summary: "The baseline cost of short-term borrowing in U.S. markets, read from the 1-month Treasury bill. Higher means borrowing costs more.",
  },
  {
    value: "regime",
    term: "Conditions (the four weather labels)",
    summary: "Each week falls into one of four: Sunny (money cheap and available), Cloudy (available but pricey), Stormy (changing week to week), Freezing (expensive and hard to raise).",
  },
  {
    value: "guardrail",
    term: DECISION_CONTRACT_LABELS.threshold.pauseIf,
    summary: "The reading at which an area of decisions — hiring, spending, long-term commitments — pauses. Stated as a number agreed in advance.",
  },
  {
    value: "resume-line",
    term: DECISION_CONTRACT_LABELS.reversal.resumeWhen,
    summary: "The reading at which paused decisions re-open. It sits past the pause line, so conditions have to improve beyond where they worsened, not merely back to it.",
  },
  {
    value: "posture-flip",
    term: DECISION_CONTRACT_LABELS.watch.postureFlips,
    summary: "The reading at which conditions themselves change, and the weekly guidance with them, rather than pausing a decision inside the current ones.",
  },
  {
    value: "confidence",
    term: "Confidence (High, Medium, Low)",
    summary: "How far this week's scores sit from the nearest line. Low means a small move would change conditions, so keep commitments reversible.",
  },
  {
    value: "fallback-mode",
    term: "Saved copy",
    summary: "When a live source does not answer, the brief uses the last reading it saved and says so with the date. Fine for reversible decisions; wait for live data before irreversible ones.",
  },
  {
    value: "yield-curve",
    term: "Yield curve",
    summary:
      "The interest rates the U.S. government pays to borrow for different lengths of time — one month, three months, two years, ten years.",
  },
  {
    value: "spread",
    term: "Spread",
    summary: "One rate minus another. A ten-year minus two-year spread of +1.2% means long borrowing costs 1.2 percentage points more than short.",
  },
  {
    value: "inversion",
    term: "Inversion",
    summary: "A spread below zero: short-term borrowing costs more than long-term.",
  },
  {
    value: "credit-spread",
    term: "High-yield credit spread",
    summary:
      "The extra interest riskier companies pay to borrow over what the government pays. It widens when lenders get nervous.",
  },
  {
    value: "vix",
    term: "VIX",
    summary:
      "An index of how much stock-price turbulence traders expect over the next month. Higher means more expected turbulence.",
  },
  {
    value: "financial-conditions-index",
    term: "Chicago Fed financial conditions index",
    summary:
      "A Federal Reserve summary of how easy or hard overall borrowing is. Zero is average; above zero is tighter than average.",
  },
  {
    value: "fred-series",
    term: "St. Louis Fed (FRED) series codes (DGS1MO, DGS2, DGS10)",
    summary:
      "FRED is the Federal Reserve's free public data service. DGS1MO is the one-month Treasury bill used as the short-term borrowing rate, DGS2 the two-year Treasury rate, DGS10 the ten-year.",
  },
];

/*
 * `SIGNALS_RELATED_LINKS` and `ONBOARDING_RELATED_LINKS` stood here: two arrays
 * of {href, label, description} for `/`, `/operate` and `/trust`, rendered by
 * nothing and kept alive by a test asserting each entry had a description.
 *
 * They were a third copy of the information architecture. `navigationLayers` in
 * lib/navigation/informationArchitecture.ts already carries a label, a
 * description and a boundary for every one of those routes, and that module says
 * in as many words to render the array rather than restate it — the footer's own
 * hand-listed copy of the utility row is recorded there as having drifted. A
 * page that wants a where-next row should read the IA.
 */
