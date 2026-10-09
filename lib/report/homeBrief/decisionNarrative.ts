import type { RegimeConfidenceLabel } from "../../regimePresentation";
import { isImprovingSignalDelta } from "../reportData";
import type { Regime, SignalChange } from "../homeBriefModel";
import type { ReportDynamics } from "../reportDataTypes";
import type { WeeklyTone } from "../reportEvidence";
import { comparisonBasis, type ComparisonBasis } from "../comparisonBasis";
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
   "Re-open when", which is the resume line's old name — the same string was
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
    summary: movementSentence ?? `Conditions held steady ${window}. Last week's guidance stands.`,
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
      ? "Conditions are sitting on the line where they change"
      : nearestThresholdGap <= 12
        ? "Conditions have modest room before the line where they change"
        : "Conditions are well clear of the line where they change";

  const hasPositiveMoves = changedSignals.some((signal) => signal.delta > 0);
  const hasNegativeMoves = changedSignals.some((signal) => signal.delta < 0);
  const directionalSplit = hasPositiveMoves && hasNegativeMoves;
  const signalClause =
    changedSignals.length === 0
      ? "and this week's readings barely moved"
      : directionalSplit || changedSignals.length >= 3
        ? "and this week's readings pulled against each other"
        : "and this week's readings moved together";

  const verdict =
    confidenceLabel === "LOW"
      ? "Treat it as provisional until another read confirms it."
      : confidenceLabel === "MED"
        ? "Plan against it, but hold anything irreversible."
        : "It is stable enough for this week's approvals.";

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
  // Plain instructions: who gets approved, what waits. These read "Tighten to
  // survival mode:", "Operate for proof:" and "Press proven growth lanes" — a
  // label, a colon and a list of three, with "lanes" standing in for whatever
  // the reader actually sells. The share formats print this line as the
  // guidance, so it is the sentence most often pasted into someone's channel.
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    if (currentRegime === "SCARCITY") {
      return "Approve only renewals, work already promised to customers, and hires that bring in revenue.";
    }
    if (currentRegime === "DEFENSIVE") {
      return "Tighten approvals to work that protects retention, margin or revenue.";
    }
    if (currentRegime === "VOLATILE") {
      return "Ship fixes and releases that pay back quickly; hold anything you could not reverse.";
    }
    return "Keep growing, but add people only where demand is already proven, and write down when you would stop.";
  }

  if ((severityDelta < 0 || directionLabel === "improving") && currentRegime === "EXPANSION") {
    return "Put more behind what is already selling, and hire where demand is already converting.";
  }

  if (currentRegime === "SCARCITY") {
    return "Spend only on renewals, work already promised to customers, and hires that bring in revenue.";
  }
  if (currentRegime === "DEFENSIVE") {
    return "Hold approvals steady for work that protects retention, margin or revenue.";
  }
  if (currentRegime === "VOLATILE") {
    return "Favour releases that pay back quickly and can be rolled back.";
  }
  return "Put more behind what is already selling, and hire where demand is already converting.";
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

export const buildWhyItMattersLine = ({
  weeklyMovement,
}: {
  weeklyMovement: {
    direction: "tightening" | "easing" | "stable" | "unavailable";
  };
}) => {
  if (weeklyMovement.direction === "unavailable") {
    return "This week's move is not known, because there is no previous reading to compare against. The approval rules below stand on where the signals sit now, not on a change.";
  }

  if (weeklyMovement.direction === "tightening") {
    return "Fixed-cost mistakes are getting more expensive, so long-payback bets now need harder proof and tighter approval discipline.";
  }

  if (weeklyMovement.direction === "easing") {
    return "Speed is getting safer, so teams can press proven demand lanes faster without dropping payback discipline.";
  }

  return "Nothing moved enough this week to change pace, so last week's approval rules still hold until a significant signal shifts the forecast.";
};

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
