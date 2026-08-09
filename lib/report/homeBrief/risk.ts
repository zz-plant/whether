import { isImprovingSignalDelta } from "../reportData";

type HomeBriefFailureMode = { warning: string };
type SignalChange = {
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
  delta: number;
};

/**
 * Each signal gets its own verb pair. A generic "tightened/eased" applied to all
 * four produces nonsense like "Risk appetite tightened".
 */
const signalMoveCopy: Record<SignalChange["key"], { better: string; worse: string }> = {
  tightness: { better: "cash availability loosened", worse: "cash availability tightened" },
  riskAppetite: { better: "risk appetite strengthened", worse: "risk appetite weakened" },
  baseRate: { better: "borrowing costs eased", worse: "borrowing costs rose" },
  curveSlope: {
    better: "the recession warning gauge steepened",
    worse: "the recession warning gauge flattened",
  },
};

export const buildPrimaryRiskLabel = ({
  failureModes,
  changedSignals,
}: {
  failureModes: HomeBriefFailureMode[];
  changedSignals: SignalChange[];
}) => {
  const dominantSignal = changedSignals
    .slice()
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  if (failureModes[0]) {
    return `Downside: ${failureModes[0].warning}`;
  }

  if (!dominantSignal || dominantSignal.delta === 0) {
    return "Neutral: nothing moved far enough this week to set the dominant risk.";
  }

  const move = signalMoveCopy[dominantSignal.key];
  const magnitude = Math.abs(dominantSignal.delta).toFixed(1);

  return isImprovingSignalDelta(dominantSignal.key, dominantSignal.delta)
    ? `Upside: ${move.better} ${magnitude} points.`
    : `Downside: ${move.worse} ${magnitude} points.`;
};
