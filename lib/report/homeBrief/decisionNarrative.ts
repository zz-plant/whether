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
    return `Changed: no material signal shift. Do now: keep approval pace and ship only commitments with clear payback windows. Flip: ${reversalTrigger}`;
  }
  if (severityDelta < 0 || directionLabel === "improving") {
    return `Changed: pressure eased versus last week. Do now: speed approvals for reversible bets and keep payback discipline explicit. Flip: ${reversalTrigger}`;
  }
  if (severityDelta > 0 || directionLabel === "deteriorating") {
    return `Changed: pressure rose versus last week. Do now: slow approvals, narrow experiments, and require tighter payback windows. Flip: ${reversalTrigger}`;
  }
  return `Changed: signals moved in opposite directions. Do now: hold approval pace and keep experiments reversible with explicit stop triggers. Flip: ${reversalTrigger}`;
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
      direction: "defensive" as const,
      summary: `Model pressure increased by +${score.toFixed(1)} this week; tighten approvals until a reversal trigger prints.`,
    };
  }

  if (score <= -0.25) {
    return {
      score,
      direction: "expansionary" as const,
      summary: `Model pressure eased by ${score.toFixed(1)} this week; release only reversible bets while watching flip thresholds.`,
    };
  }

  return {
    score,
    direction: "neutral" as const,
    summary: "Model pressure is flat this week; hold posture and keep existing guardrails in force.",
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
    direction: "defensive" | "expansionary" | "neutral";
  };
}) => {
  if (weeklyMovement.direction === "defensive") {
    return "Fixed-cost mistakes are getting more expensive, so long-payback bets now need harder proof and tighter approval discipline.";
  }

  if (weeklyMovement.direction === "expansionary") {
    return "Speed is getting safer, so teams can press proven demand lanes faster without dropping payback discipline.";
  }

  return "Stable posture means no new signal to change pace. Keep last week's approval rules in force until a material delta shifts the call.";
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
