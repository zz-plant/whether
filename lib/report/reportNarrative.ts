import type { RegimeAssessment } from "../regimeEngine";

const narrativeSigns = {
  inversion:
    "When curve slope stays inverted, assume decision caution will persist for 1–2 quarters.",
  tightness:
    "When cash availability tightens and approvals slow, expect roadmap compression before demand recovers.",
  risk:
    "When risk appetite softens, keep launches reversible and measure retention before scaling scope.",
  fallback: "No additional caution signs this cycle; maintain baseline monitoring.",
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
