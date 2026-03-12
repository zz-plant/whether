import { deltaLabelBySignal } from "../briefFormatting";
import { isImprovingSignalDelta } from "../reportData";

type HomeBriefFailureMode = { warning: string };
type SignalChange = {
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
  delta: number;
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
    return "Neutral: no dominant directional risk this week.";
  }

  const signalLabel = deltaLabelBySignal[dominantSignal.key];
  const isImprovingMove = isImprovingSignalDelta(dominantSignal.key, dominantSignal.delta);

  if (!isImprovingMove) {
    return `Downside: ${signalLabel} tightened (${dominantSignal.delta.toFixed(1)}).`;
  }

  return `Upside: ${signalLabel} eased (${Math.abs(dominantSignal.delta).toFixed(1)}).`;
};
