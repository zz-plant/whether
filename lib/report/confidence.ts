type ConfidenceInputs = {
  scores: {
    tightness: number;
    riskAppetite: number;
  };
  thresholds: {
    tightnessRegime: number;
    riskAppetiteRegime: number;
  };
};

export const resolveDistanceToFlip = ({ scores, thresholds }: ConfidenceInputs): number => {
  const tightnessGap = Math.abs(scores.tightness - thresholds.tightnessRegime);
  const riskGap = Math.abs(scores.riskAppetite - thresholds.riskAppetiteRegime);
  return Math.min(tightnessGap, riskGap);
};

export const resolveConfidencePercentFromDistance = (distanceToFlip: number): number =>
  Math.max(35, Math.min(92, Math.round(55 + distanceToFlip * 3)));

export const resolveConfidencePercent = (inputs: ConfidenceInputs): number =>
  resolveConfidencePercentFromDistance(resolveDistanceToFlip(inputs));

