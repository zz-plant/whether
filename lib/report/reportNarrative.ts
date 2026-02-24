import type { RegimeAssessment } from "../regimeEngine";

const narrativeSigns = {
  inversion:
    "If curve slope stays inverted for multiple reads, keep hiring and spend approvals in short-cycle tranches for the next 1–2 quarters.",
  tightness:
    "If cash availability tightens and approvals slow, compress roadmap scope to near-term revenue, retention, and reliability outcomes.",
  risk:
    "If risk appetite softens, keep launches reversible and require retention/conversion proof before scaling.",
  fallback: "No additional stress signals this cycle; execute the baseline plan and monitor weekly.",
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
