import {
  CONFIDENCE_PERCENT_BASELINE,
  CONFIDENCE_PERCENT_PER_POINT,
  CONFIDENCE_PERCENT_FLOOR,
  CONFIDENCE_PERCENT_CEILING,
} from "../regimeEngineCore";

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
  Math.max(CONFIDENCE_PERCENT_FLOOR, Math.min(CONFIDENCE_PERCENT_CEILING,
    Math.round(CONFIDENCE_PERCENT_BASELINE + distanceToFlip * CONFIDENCE_PERCENT_PER_POINT)));

export const resolveConfidencePercent = (inputs: ConfidenceInputs): number =>
  resolveConfidencePercentFromDistance(resolveDistanceToFlip(inputs));

