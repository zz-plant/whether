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
    return `No material shift this week. Do now: keep approval pace and focus on commitments with clear payback windows. Clears when: ${reversalTrigger}`;
  }
  if (severityDelta < 0 || directionLabel === "improving") {
    return `Pressure eased compared to last week. Do now: speed approvals for reversible bets and keep payback discipline. Clears when: ${reversalTrigger}`;
  }
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    return `Pressure rose compared to last week. Do now: slow approvals, narrow experiments, and tighten payback windows. Clears when: ${reversalTrigger}`;
  }
  return `Signals moved in opposite directions. Do now: hold approval pace and keep experiments reversible with clear stop triggers. Clears when: ${reversalTrigger}`;
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
      summary: `Pressure increased by +${score.toFixed(1)} this week; tighten approvals until conditions reverse.`,
    };
  }

  if (score <= -0.25) {
    return {
      score,
      direction: "easing" as const,
      summary: `Pressure eased by ${score.toFixed(1)} this week; approve only reversible bets while watching for reversal triggers.`,
    };
  }

  return {
    score,
    direction: "stable" as const,
    summary: "Pressure is flat this week; keep the current call and guardrails in force.",
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
  const boundaryDescriptor =
    nearestThresholdGap <= 5
      ? "regime boundary proximity"
      : nearestThresholdGap <= 12
        ? "moderate boundary distance"
        : "wide boundary distance";

  const hasPositiveMoves = changedSignals.some((signal) => signal.delta > 0);
  const hasNegativeMoves = changedSignals.some((signal) => signal.delta < 0);
  const directionalSplit = hasPositiveMoves && hasNegativeMoves;
  const volatilityDescriptor =
    changedSignals.length === 0
      ? "stable signal readings"
      : directionalSplit || changedSignals.length >= 3
        ? "volatile macro signals"
        : "broad agreement across signals";

  if (confidenceLabel === "LOW") {
    return `Reason: ${boundaryDescriptor} + ${volatilityDescriptor}`;
  }

  if (confidenceLabel === "MED") {
    return `Reason: ${boundaryDescriptor} with ${volatilityDescriptor}`;
  }

  return `Reason: ${volatilityDescriptor}; ${boundaryDescriptor}`;
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

export const buildWeeklyMemoLines = ({
  operatingStanceLine,
  trendLabel,
  transitionWatch,
}: {
  operatingStanceLine: string;
  trendLabel: string;
  transitionWatch: "ON" | "OFF";
}) => [
  trendLabel === "Stable"
    ? "Changed: no material signal shift this week."
    : `Changed: market conditions are ${trendLabel.toLowerCase()} this week.`,
  operatingStanceLine,
  transitionWatch === "ON"
    ? "Flip watch is on: keep hiring, roadmap, and spend decisions reversible until the next live read."
    : "Flip watch is off: keep this week's approvals on the current track.",
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

  return "Stable posture means no new signal to change pace. Keep last week's approval rules until a significant change shifts the forecast.";
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
