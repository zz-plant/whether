import { REGIME_SHORT_LABELS, type RegimeConfidenceLabel } from "../../regimePresentation";
import { isImprovingSignalDelta } from "../reportData";
import type { Regime, SignalChange } from "../homeBriefModel";

const regimeShiftTargets = {
  SCARCITY: { defensive: "DEFENSIVE" },
  DEFENSIVE: { defensive: "SCARCITY" },
  VOLATILE: { defensive: "SCARCITY" },
  EXPANSION: { defensive: "DEFENSIVE" },
} as const;

export const resolvePrimaryShiftRegimeLabel = (regime: Regime) =>
  REGIME_SHORT_LABELS[regimeShiftTargets[regime].defensive];

export const resolvePrimaryShiftRegimeKey = (regime: Regime) =>
  regimeShiftTargets[regime].defensive;

export const buildDecisionShiftSummary = ({
  severityDelta,
  directionLabel,
  changeCount,
  reversalTrigger,
}: {
  severityDelta: number;
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable" | undefined;
  changeCount: number;
  reversalTrigger: string;
}) => {
  if (changeCount === 0 || directionLabel === "stable") {
    return `No significant change this week. Keep your current plan. Re-open when: ${reversalTrigger}`;
  }
  if (severityDelta < 0 || directionLabel === "improving") {
    return `Conditions improved. Move faster on what's working. Re-open when: ${reversalTrigger}`;
  }
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    return `Conditions tightened. Slow new commitments and focus on what's already in motion. Re-open when: ${reversalTrigger}`;
  }
  return `Mixed signals this week. Hold steady and keep new moves reversible. Re-open when: ${reversalTrigger}`;
};

export const buildWeeklyMovementMetric = ({
  severityDelta,
  changedSignals,
}: {
  severityDelta: number;
  changedSignals: SignalChange[];
}) => {
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
    summary: "Conditions held steady this week. Last week's calls stand.",
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
      ? "This call is sitting on a regime boundary"
      : nearestThresholdGap <= 12
        ? "This call has modest room before the nearest boundary"
        : "This call is well clear of the nearest boundary";

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
  directionLabel: "improving" | "deteriorating" | "mixed" | "stable" | undefined;
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
      return "De-risk the call: ship reliability, trust, and short-payback releases.";
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
  changeCourseIf,
}: {
  operatingStanceLine: string;
  trendLabel: string;
  transitionWatch: "ON" | "OFF";
  pauseIf: string;
  changeCourseIf: string;
}) => [
  trendMemoLines[trendLabel] ?? trendMemoLines.Stable,
  operatingStanceLine,
  // The stance line is already line 2, so this line adds the watch state and its
  // condition instead of restating it.
  transitionWatch === "ON"
    ? `Flip watch is on, so keep hiring, roadmap, and spend decisions reversible until the next live weekly refresh. ${pauseIf}`
    : `Flip watch is off, so this week's calls hold. Change course when: ${changeCourseIf}`,
];

export const buildWhyItMattersLine = ({
  weeklyMovement,
}: {
  weeklyMovement: {
    direction: "tightening" | "easing" | "stable";
  };
}) => {
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
      label: "What would reverse the call",
      detail: reversalTrigger.trim(),
    },
  ].filter((item) => item.detail.length > 0);
