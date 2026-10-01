import type { RegimeConfidenceLabel } from "../../regimePresentation";
import { isImprovingSignalDelta } from "../reportData";
import type { Regime, SignalChange } from "../homeBriefModel";
import type { ReportDynamics } from "../reportDataTypes";
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
    reversalTrigger ? `${headline} ${CALL_CHANGES_IF}: ${reversalTrigger}` : headline;
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
  /* The comparison is the previous monthly snapshot, so a week that records its
     date says "since Aug 31" where these sentences used to say "this week". */
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

export const buildWeeklyMemoLines = ({
  operatingStanceLine,
  trendLabel,
  transitionWatch,
  pauseIf,
  callChangesIf,
}: {
  operatingStanceLine: string;
  trendLabel: string;
  transitionWatch: "ON" | "OFF";
  pauseIf: string;
  callChangesIf: string;
}) => [
  trendMemoLines[trendLabel] ?? trendMemoLines.Stable,
  operatingStanceLine,
  // The stance line is already line 2, so this line adds the watch state and its
  // condition instead of restating it.
  transitionWatch === "ON"
    ? `Conditions could change next week, so keep hiring, roadmap, and spend decisions reversible until the next live weekly refresh. ${pauseIf}`
    : `Conditions are not expected to change next week, so this week's guidance holds. ${CALL_CHANGES_IF}: ${callChangesIf}`,
];

export const buildWhyItMattersLine = ({
  weeklyMovement,
}: {
  weeklyMovement: {
    direction: "tightening" | "easing" | "stable" | "unavailable";
  };
}) => {
  if (weeklyMovement.direction === "unavailable") {
    return "This week's move is not known — there is no previous reading to compare against — so the approval rules below stand on where the signals sit now, not on a change.";
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
