import type { RegimeAssessment } from "../regimeEngine";

const narrativeSigns = {
  inversion:
    "The recession warning gauge is still inverted, so plan for another quarter or two of cautious approvals.",
  tightness:
    "Cash is tight and approvals are slowing, so expect the roadmap to compress before demand comes back.",
  risk:
    "Risk appetite is softening, so keep launches reversible and prove retention before you scale scope.",
  fallback: "Nothing new to flag this cycle. Keep watching the same signals until the posture changes.",
} as const;

export const buildSignsToWatch = (assessment: RegimeAssessment) => {
  const signs: string[] = [];

  if (assessment.scores.curveSlope !== null && assessment.scores.curveSlope < 0) {
    signs.push(narrativeSigns.inversion);
  }

  if (assessment.scores.tightness >= assessment.thresholds.tightnessRegime) {
    signs.push(narrativeSigns.tightness);
  }

  if (assessment.scores.riskAppetite < assessment.thresholds.riskAppetiteRegime) {
    signs.push(narrativeSigns.risk);
  }

  if (signs.length === 0) {
    signs.push(narrativeSigns.fallback);
  }

  return signs.slice(0, 3);
};
