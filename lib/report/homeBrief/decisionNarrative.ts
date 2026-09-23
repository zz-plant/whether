import type { RegimeConfidenceLabel } from "../../regimePresentation";
import { isImprovingSignalDelta } from "../reportData";
import type { Regime, SignalChange } from "../homeBriefModel";
import type { ReportDynamics } from "../reportDataTypes";
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
}: {
  severityDelta: number;
  directionLabel: ReportDynamics["directionLabel"] | undefined;
  changeCount: number;
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
}: {
  severityDelta: number;
  changedSignals: SignalChange[];
  directionLabel: ReportDynamics["directionLabel"] | undefined;
}) => {
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

  if (score >= 0.25) {
    return {
      score,
      direction: "tightening" as const,
      summary: `Pressure increased by +${score.toFixed(1)} this week. Slow new commitments until conditions stabilize.`,
    };
  }

  if (score <= -0.25) {
    return {
      score,
      direction: "easing" as const,
      summary: `Pressure eased by ${score.toFixed(1)} this week. Move faster on what's already working.`,
    };
  }

  return {
    score,
    direction: "stable" as const,
    summary: "Conditions held steady this week. Last week's guidance stands.",
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
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    if (currentRegime === "SCARCITY") {
      return "Tighten to survival mode: approve only renewals, core delivery, and revenue-backed roles.";
    }
    if (currentRegime === "DEFENSIVE") {
      return "Tighten approvals around retention, margin, and revenue-linked work.";
    }
    if (currentRegime === "VOLATILE") {
      return "De-risk this week: ship reliability, trust, and short-payback releases.";
    }
    return "Keep expansion selective: add capacity only in proven demand lanes and keep rollback criteria explicit.";
  }

  if ((severityDelta < 0 || directionLabel === "improving") && currentRegime === "EXPANSION") {
    return "Press proven growth lanes and add capacity where demand is already converting.";
  }

  if (currentRegime === "SCARCITY") {
    return "Operate for cash survival: approve only renewals, core delivery, and revenue-backed roles.";
  }
  if (currentRegime === "DEFENSIVE") {
    return "Hold approvals steady around retention, margin, and revenue-linked work.";
  }
  if (currentRegime === "VOLATILE") {
    return "Operate for proof: ship reliability, trust, and short-payback releases.";
  }
  return "Press proven growth lanes and add capacity where demand is already converting.";
};

const trendMemoLines: Record<string, string> = {
  Stable: "No material signal shift this week.",
  Improving: "Conditions loosened this week.",
  Deteriorating: "Conditions tightened this week.",
  Mixed: "Signals split this week — some loosened, some tightened.",
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
    : `Conditions are not close to changing, so this week's guidance holds. ${CALL_CHANGES_IF}: ${callChangesIf}`,
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
