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
import { formatThresholdNumber } from "../formatters";
import { sharedDecisionLines } from "../report/boundedDecisionRules";
import { deltaLabelBySignal } from "../report/briefFormatting";
import { compositeSignalScales } from "../report/signalTranslations";

type HorizonNoun = "month" | "quarter";

export type HorizonOperatingRule = {
  action: string;
  threshold: string;
  reversal: string;
};

/** The two composite signals the horizon rule is written against. */
type HorizonBandSignalKey = "tightness" | "riskAppetite";

/**
 * One signal's half of the horizon rule, as numbers rather than as a sentence.
 *
 * `buildHorizonOperatingRule` renders the same four thresholds into prose, which is
 * what exports and screen readers consume. A sentence cannot say where the signal
 * actually sits, so it reads identically whether funding pressure is parked well clear
 * of the pause or one print away from it. Anything that wants to *draw* the rule needs
 * the bands, and it has to get them from the same arithmetic or the picture and the
 * paragraph will disagree about the same call.
 */
export type HorizonSignalBand = {
  key: HorizonBandSignalKey;
  /** Canonical operator-facing name. Sourced, not spelled again here. */
  label: string;
  /** Where the signal sits on this read, 0-100. */
  current: number;
  /** The same score at the previous read, when the caller has one. */
  previous: number | null;
  /** Crossing this trips the pause. */
  pause: number;
  /** Clearing this satisfies this signal's half of the reversal. */
  resume: number;
  /**
   * Which side of `pause` is the trouble side — funding pressure rises into it, risk
   * appetite falls into it. A drawing that wants both signals to read the same way has
   * to know which of the two runs backwards.
   */
  pauseWhen: "above" | "below";
  /** Points from this read to each edge. Never negative; pair with the flags below. */
  toPause: number;
  toResume: number;
  /** Whether the pause condition fires on this read. */
  pauseTripped: boolean;
  /** Whether this signal's half of the reversal holds on this read. */
  resumeHolds: boolean;
  /** Which end of the scale carries which meaning, so a flipped rail stays readable. */
  directionLabel: string;
};

/** Pause above / resume below for funding pressure, pause below / resume above for risk
 *  appetite: the rules' shared lines, so a summary band and a rule never disagree. The gap
 *  between the pause and resume band is deliberate: a rule that reopens at the same number
 *  it closed at flips on noise. */
export const buildHorizonThresholdBands = (assessment: RegimeAssessment) => sharedDecisionLines(assessment.thresholds);

const buildBand = ({
  key,
  current,
  previous,
  pause,
  resume,
  pauseWhen,
}: {
  key: HorizonBandSignalKey;
  current: number;
  previous: number | null;
  pause: number;
  resume: number;
  pauseWhen: "above" | "below";
}): HorizonSignalBand => {
  const pauseTripped = pauseWhen === "above" ? current > pause : current < pause;
  const resumeHolds = pauseWhen === "above" ? current < resume : current > resume;

  return {
    key,
    label: deltaLabelBySignal[key],
    current,
    previous: previous == null || !Number.isFinite(previous) ? null : previous,
    pause,
    resume,
    pauseWhen,
    toPause: Math.abs(pause - current),
    toResume: Math.abs(resume - current),
    pauseTripped,
    resumeHolds,
    directionLabel: compositeSignalScales[key].directionLabel,
  };
};

/**
 * The horizon rule as bands rather than as sentences, off the same thresholds.
 *
 * Order is funding pressure then risk appetite, matching the order both sentences name
 * them in — a reader moving between the prose and the drawing should not have to
 * re-find which signal is which.
 */
export const buildHorizonSignalBands = ({
  assessment,
  previousScores,
}: {
  assessment: RegimeAssessment;
  previousScores?: { tightness?: number | null; riskAppetite?: number | null } | null;
}): HorizonSignalBand[] => {
  const { tightnessPause, tightnessResume, riskPause, riskResume } =
    buildHorizonThresholdBands(assessment);

  return [
    buildBand({
      key: "tightness",
      current: assessment.scores.tightness,
      previous: previousScores?.tightness ?? null,
      pause: tightnessPause,
      resume: tightnessResume,
      pauseWhen: "above",
    }),
    buildBand({
      key: "riskAppetite",
      current: assessment.scores.riskAppetite,
      previous: previousScores?.riskAppetite ?? null,
      pause: riskPause,
      resume: riskResume,
      pauseWhen: "below",
    }),
  ];
};

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
    threshold: `Pause new hires and multi-year contracts if funding pressure rises above ${formatThresholdNumber(tightnessPause)} or risk appetite falls below ${formatThresholdNumber(riskPause)}.`,
    reversal: `Restart them when funding pressure is below ${formatThresholdNumber(tightnessResume)} and risk appetite is above ${formatThresholdNumber(riskResume)}.`,
  };
};
