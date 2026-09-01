/**
 * The threshold arithmetic behind a horizon's default operating rule.
 *
 * Monthly and quarterly both answer the same bounded-decision question — apply the
 * horizon's priority, pause above/below these numbers, reopen at these — off the same
 * regime thresholds. Only the horizon noun and the guidance sentence differ, so the
 * bands live here once rather than being re-derived per cadence, which is how two
 * surfaces end up quoting different numbers for the same call.
 */
import type { RegimeAssessment } from "../regimeEngine";

export type HorizonNoun = "month" | "quarter";

export type HorizonOperatingRule = {
  action: string;
  threshold: string;
  reversal: string;
};

/** Pause above / resume below for funding pressure, pause below / resume above for risk
 *  appetite. The gap between the pause and resume band is deliberate: a rule that reopens
 *  at the same number it closed at flips on noise. */
export const buildHorizonThresholdBands = (assessment: RegimeAssessment) => ({
  tightnessPause: assessment.thresholds.tightnessRegime + 6,
  tightnessResume: Math.max(assessment.thresholds.tightnessRegime - 4, 0),
  riskPause: Math.max(assessment.thresholds.riskAppetiteRegime - 6, 0),
  riskResume: Math.min(assessment.thresholds.riskAppetiteRegime + 4, 100),
});

export const buildHorizonOperatingRule = ({
  assessment,
  guidance,
  horizon,
}: {
  assessment: RegimeAssessment;
  guidance: string;
  horizon: HorizonNoun;
}): HorizonOperatingRule => {
  const { tightnessPause, tightnessResume, riskPause, riskResume } =
    buildHorizonThresholdBands(assessment);

  return {
    action: `Apply this ${horizon}'s priority: ${guidance}.`,
    threshold: `Pause broader commitments if funding pressure rises above ${tightnessPause.toFixed(1)} or risk appetite falls below ${riskPause.toFixed(1)}.`,
    reversal: `Reopen broader scope when funding pressure is below ${tightnessResume.toFixed(1)} and risk appetite is above ${riskResume.toFixed(1)}.`,
  };
};
