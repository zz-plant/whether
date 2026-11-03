import type { RegimeConfidenceLabel } from "../../regimePresentation";
import { isImprovingSignalDelta } from "../reportData";
import type { Regime, SignalChange } from "../homeBriefModel";
import type { ReportDynamics } from "../reportDataTypes";
import type { WeeklyTone } from "../reportEvidence";
import { comparisonBasis, type ComparisonBasis, describeGuidanceStands } from "../comparisonBasis";
import { DECISION_CONTRACT_LABELS } from "../reportCopy";

const regimeShiftTargets = {
  SCARCITY: { defensive: "DEFENSIVE" },
  DEFENSIVE: { defensive: "SCARCITY" },
  VOLATILE: { defensive: "SCARCITY" },
  EXPANSION: { defensive: "DEFENSIVE" },
} as const;

export const resolvePrimaryShiftRegimeKey = (regime: Regime) =>
  regimeShiftTargets[regime].defensive;

/* `reversalTrigger` here is the line where the call itself changes (the caller
   passes `conciseFlipThreshold`), so it takes that line's name. It read
   "Re-open when", which is the restart line's old name — the same string was
   labelled one line on the hero and the other line here. */
const CALL_CHANGES_IF = DECISION_CONTRACT_LABELS.watch.postureFlips;

export const buildDecisionShiftSummary = ({
  severityDelta,
  directionLabel,
  changeCount,
  reversalTrigger,
  movementSentence,
}: {
  severityDelta: number;
  directionLabel: ReportDynamics["directionLabel"] | undefined;
  changeCount: number;
  /* What the week did to the decisions (`buildDecisionMovement`). When a comparison
     was made it is the whole answer: the branches below name a direction and
     prescribe an action ("Slow new commitments…") that the guidance under them
     already states, and on a week nothing crossed a line they said it anyway. */
  movementSentence?: string;
  /* Omitted by the surfaces that print their own change line: appended there,
     the board note read "Conditions change if" twice, naming two different lines. */
  reversalTrigger?: string;
}) => {
  const withTrigger = (headline: string) =>
    reversalTrigger ? appendCallChangesIf(headline, reversalTrigger) : headline;
  if (directionLabel === "unavailable") {
    /* Nothing was compared, so "no significant change" is not available to say.
       The call still stands on where the signals sit; what is missing is the
       week-over-week half of the sentence. */
    return withTrigger("No previous reading to compare this week against. The guidance below comes from where the signals sit now.");
  }
  if (movementSentence) return withTrigger(movementSentence);
  if (changeCount === 0 || directionLabel === "stable") {
    return withTrigger("No significant change this week. Keep your current plan.");
  }
  if (severityDelta < 0 || directionLabel === "improving") {
    return withTrigger("Conditions improved. Move faster on what's working.");
  }
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    return withTrigger("Conditions tightened. Slow new commitments and focus on what's already in motion.");
  }
  return withTrigger("Mixed signals this week. Hold steady and keep new moves reversible.");
};

export const buildWeeklyMovementMetric = ({
  severityDelta,
  changedSignals,
  directionLabel,
  basis = comparisonBasis(),
  movementSentence,
}: {
  severityDelta: number;
  changedSignals: SignalChange[];
  directionLabel: ReportDynamics["directionLabel"] | undefined;
  /** What the moves are measured against; "this week" wording when the week does not date it. */
  basis?: ComparisonBasis;
  /** What the week did to the decisions (`buildDecisionMovement`); the archive's "what changed". */
  movementSentence?: string;
}) => {
  /* The comparison is last week's brief or the previous month-end, so a week
     that records its date says "since Sep 29" where these sentences used to say
     "this week". */
  const window = basis.date ? basis.since : "this week";
  /* Absence of a comparison scores nothing. Without this the inputs of "no
     previous reading" and "a week that moved nothing" are identical — both are
     a zero severity delta and an empty signal list — and this function reported
     the second: "Conditions held steady this week. Last week's guidance stands." */
  if (directionLabel === "unavailable") {
    return {
      score: null,
      direction: "unavailable" as const,
      summary: "No previous reading to compare this week against.",
    };
  }

  const movementDomainBySignal: Record<SignalChange["key"], number> = {
    tightness: 6,
    riskAppetite: 6,
    baseRate: 1.5,
    curveSlope: 1.5,
  };

  const directionalPressure = changedSignals.reduce((sum, signal) => {
    const domain = movementDomainBySignal[signal.key] ?? 1;
    const normalizedMagnitude = Math.min(1, Math.abs(signal.delta) / domain);
    const direction = isImprovingSignalDelta(signal.key, signal.delta) ? -1 : 1;
    return sum + (normalizedMagnitude * direction);
  }, 0);

  const rawScore = severityDelta + directionalPressure;
  const score = Number(Math.max(-3, Math.min(3, rawScore)).toFixed(1));

  /* The summary is a sentence about decisions. It used to be "Pressure increased by
     +3.0 this week. Slow new commitments until conditions stabilize", which the
     archive printed on two consecutive weeks beside "freeze new commitments": a
     figure in a unit nothing else uses, and an instruction of its own. Without the
     lines to read it against, it says which way the scores went and nothing more. */
  if (score >= 0.25) {
    return {
      score,
      direction: "tightening" as const,
      summary: movementSentence ?? `Conditions tightened ${window}.`,
    };
  }

  if (score <= -0.25) {
    return {
      score,
      direction: "easing" as const,
      summary: movementSentence ?? `Conditions eased ${window}.`,
    };
  }

  return {
    score,
    direction: "stable" as const,
    summary: movementSentence ?? `Conditions held steady ${window}. ${describeGuidanceStands(basis)}`,
  };
};

export const buildSignalConfidenceReason = ({
  confidenceLabel,
  nearestThresholdGap,
  changedSignals,
}: {
  confidenceLabel: RegimeConfidenceLabel;
  nearestThresholdGap: number;
  changedSignals: Array<{ delta: number }>;
}) => {
  const boundaryClause =
    nearestThresholdGap <= 5
      ? "Conditions could change any week"
      : nearestThresholdGap <= 12
        ? "Conditions are a little way from changing"
        : "Conditions are nowhere near changing";

  const hasPositiveMoves = changedSignals.some((signal) => signal.delta > 0);
  const hasNegativeMoves = changedSignals.some((signal) => signal.delta < 0);
  const directionalSplit = hasPositiveMoves && hasNegativeMoves;
  const signalClause =
    changedSignals.length === 0
      ? "and this week's readings barely moved"
      : directionalSplit || changedSignals.length >= 3
        ? "and this week's numbers pointed different ways"
        : "and this week's readings moved together";

  const verdict =
    confidenceLabel === "LOW"
      ? "Treat it as tentative until next week's numbers back it up."
      : confidenceLabel === "MED"
        ? "Plan against it, but hold anything irreversible."
        : "It is stable enough to decide on this week.";

  return `${boundaryClause} ${signalClause}. ${verdict}`;
};

export const buildOperatingStanceLine = ({
  severityDelta,
  directionLabel,
  currentRegime,
}: {
  severityDelta: number;
  directionLabel: ReportDynamics["directionLabel"] | undefined;
  currentRegime: Regime;
}) => {
  // Plain instructions: what to commit to, and what waits. These read "Tighten to
  // survival mode:", "Operate for proof:" and "Press proven growth lanes" — a
  // label, a colon and a list of three, with "lanes" standing in for whatever
  // the reader actually sells. The share formats print this line as the
  // guidance, so it is the sentence most often pasted into someone's channel.
  //
  // Since 2026-10-14 each is a rule for any commitment, true on a first visit:
  // - No relative verbs. "Tighten approvals" and "Hold approvals steady" were
  //   changes from a bar the reader was assumed to have set last week; the
  //   kicker ("Tightening this week") already says the direction.
  // - No approval process assumed. A seed founder decides rather than approves;
  //   "commit to" covers a hire, a contract, a launch or a spend.
  // - No business model assumed. "Retention", "renewals" and "releases that can
  //   be rolled back" were a software company's words; "income you already
  //   have", "customers" and "can be undone" hold for any.
  // The worse-week and steady-week sentences now differ only where the advice
  // does: a worsening Sunny week names the stop condition.
  // - Said the way a colleague would say it (2026-10-28). "Commit to what
  //   protects income you have; new bets wait for cheaper money." had a hollow
  //   "what" for an object, no "the", and bets doing the waiting; "Favour" and
  //   "could not reverse" were a register nobody uses in a meeting.
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    if (currentRegime === "SCARCITY") {
      return "Only say yes to things that bring in cash or that a customer is already counting on.";
    }
    if (currentRegime === "DEFENSIVE") {
      return "Protect the revenue you already have, and hold off on new bets until money gets cheaper.";
    }
    if (currentRegime === "VOLATILE") {
      return "Go for things that pay off soon and that you can undo, and hold off on anything you can't take back.";
    }
    return "Keep growing where demand is proven, and agree now on what would make you stop.";
  }

  if ((severityDelta < 0 || directionLabel === "improving") && currentRegime === "EXPANSION") {
    return "Put more into what's already working, and grow where demand is proven.";
  }

  if (currentRegime === "SCARCITY") {
    return "Only say yes to things that bring in cash or that a customer is already counting on.";
  }
  if (currentRegime === "DEFENSIVE") {
    return "Protect the revenue you already have, and hold off on new bets until money gets cheaper.";
  }
  if (currentRegime === "VOLATILE") {
    return "Go for things that pay off soon and that you can undo, and hold off on anything you can't take back.";
  }
  return "Put more into what's already working, and grow where demand is proven.";
};

const trendMemoLines: Record<string, string> = {
  Stable: "No material signal shift this week.",
  Improving: "Conditions loosened this week.",
  Deteriorating: "Conditions tightened this week.",
  Mixed: "Signals split this week: some loosened, some tightened.",
};

/*
 * The memo's first line, through the headline's rule (`resolveWeeklyTone`). It
 * read the score direction alone, so `/api/decision` answered "Conditions
 * loosened this week." beside an action that opened "Conditions are holding."
 * while a pause line was met, and a week with nothing to compare fell through to
 * "No material signal shift this week.", a finding from a comparison nobody made.
 */
export const describeWeeklyMemoLead = (trendLabel: string, weeklyTone: WeeklyTone | null) => {
  if (weeklyTone === null) return "No previous reading to compare this week against.";
  if (weeklyTone === "tightening") return trendMemoLines.Deteriorating;
  if (weeklyTone === "easing") return trendMemoLines.Improving;
  if (trendLabel === "Improving") return "The readings improved this week, but a pause line still applies, so the guidance holds.";
  return trendMemoLines[trendLabel] ?? trendMemoLines.Stable;
};

/**
 * The /api/decision memo: the week's direction (`describeWeeklyMemoLead`), the call,
 * then the watch state with its line. The card model builds it again from the weekly
 * contract (`buildWeeklyDecisionCardViewModel`), so the memo prints the contract's
 * call and its "Conditions change if": it printed the home model's own until
 * 2026-10-07, and on the ordinary week the parity test renders that was "Ship fixes
 * and releases that pay back quickly; hold anything you could not reverse." beside
 * every paste's "Favour releases that pay back quickly and can be rolled back.".
 */
export const buildWeeklyMemoLines = ({
  lead,
  operatingStanceLine,
  transitionWatch,
  pauseIf,
  callChangesIf,
}: {
  /** `describeWeeklyMemoLead`: the week's direction by the headline's rule. */
  lead: string;
  operatingStanceLine: string;
  transitionWatch: "ON" | "OFF";
  pauseIf: string;
  callChangesIf: string;
}) => [
  lead,
  operatingStanceLine,
  // The stance line is already line 2, so this line adds the watch state and its
  // condition instead of restating it.
  transitionWatch === "ON"
    ? `Conditions could change next week, so keep hiring, roadmap, and spend decisions reversible until the next live weekly refresh. ${pauseIf}`
    : appendCallChangesIf("Conditions are not expected to change next week, so this week's guidance holds.", callChangesIf),
];

/**
 * A sentence followed by what would change the guidance, under its label: the shift
 * summary and the memo's last line both end this way. The card model appends the
 * weekly contract's sentence to the home model's shift headline with it, so the
 * label and the joint are written once.
 */
export const appendCallChangesIf = (headline: string, callChangesIf: string) =>
  `${headline} ${CALL_CHANGES_IF}: ${callChangesIf}`;

export const buildReadThisCardItems = ({
  decisionShiftSummary,
  immediateDecision,
  reversalTrigger,
}: {
  decisionShiftSummary: string;
  immediateDecision: string;
  reversalTrigger: string;
}) =>
  [
    {
      label: "What changed",
      detail: decisionShiftSummary.replace(/^Changed:\s*/i, "").trim(),
    },
    {
      label: "What action it changes",
      detail: immediateDecision.trim(),
    },
    {
      label: DECISION_CONTRACT_LABELS.watch.flipWatch,
      detail: reversalTrigger.trim(),
    },
  ].filter((item) => item.detail.length > 0);
