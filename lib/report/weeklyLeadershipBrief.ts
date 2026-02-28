import type { RegimeAssessment } from "../regimeEngine";
import type { TreasuryData } from "../types";

export type TrendLabel = "Strengthening" | "Flat" | "Cooling";

type WindowThresholds = {
  open: number;
  strong: number;
};

export type WeeklyLeadershipBriefInputs = {
  assessment: RegimeAssessment;
  previousAssessment: RegimeAssessment | null;
  treasury: TreasuryData;
  last4Boldness: number[];
  hiringTrendDelta: number;
  stabilityWeeks: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const buildBoldnessScore = (tightness: number, riskAppetite: number) =>
  clamp(Math.round(riskAppetite * 0.7 + (100 - tightness) * 0.3), 0, 100);

export const toTrendLabel = (delta: number): TrendLabel => {
  if (delta >= 2) {
    return "Strengthening";
  }
  if (delta <= -2) {
    return "Cooling";
  }
  return "Flat";
};

export const getWindowState = (value: number, thresholds: WindowThresholds) => {
  if (value >= thresholds.strong) {
    return "Strong";
  }
  if (value >= thresholds.open) {
    return "Open";
  }
  return "Constrained";
};

export const getNetDeltaLabel = (delta: number) => {
  if (delta > 0) {
    return "Slightly more aggressive than last week.";
  }
  if (delta < 0) {
    return "Slightly more defensive than last week.";
  }
  return "No net aggression change versus last week.";
};

export const buildWeeklyLeadershipBriefModel = ({
  assessment,
  previousAssessment,
  treasury,
  last4Boldness,
  hiringTrendDelta,
  stabilityWeeks,
}: WeeklyLeadershipBriefInputs) => {
  const boldnessScore = buildBoldnessScore(
    assessment.scores.tightness,
    assessment.scores.riskAppetite,
  );
  const previousBoldness = previousAssessment
    ? buildBoldnessScore(
        previousAssessment.scores.tightness,
        previousAssessment.scores.riskAppetite,
      )
    : boldnessScore;
  const boldnessDelta = boldnessScore - previousBoldness;

  const hiringWindow = getWindowState(100 - assessment.scores.tightness, {
    open: 38,
    strong: 64,
  });
  const expansionWindow = getWindowState(assessment.scores.riskAppetite, {
    open: 45,
    strong: 65,
  });
  const previousHiringWindow = previousAssessment
    ? getWindowState(100 - previousAssessment.scores.tightness, {
        open: 38,
        strong: 64,
      })
    : hiringWindow;

  const tightnessDelta = previousAssessment
    ? assessment.scores.tightness - previousAssessment.scores.tightness
    : 0;
  const riskDelta = previousAssessment
    ? assessment.scores.riskAppetite - previousAssessment.scores.riskAppetite
    : 0;
  const curveDelta = previousAssessment
    ? (assessment.scores.curveSlope ?? 0) - (previousAssessment.scores.curveSlope ?? 0)
    : 0;

  const hiringTrend = toTrendLabel(hiringTrendDelta);

  return {
    boldnessScore,
    boldnessDelta,
    hiringWindow,
    expansionWindow,
    raiseWindow:
      boldnessDelta >= 2 ? "Improving" : boldnessDelta <= -2 ? "Narrowing" : "Stable",
    expansionTrend: toTrendLabel(
      assessment.scores.riskAppetite -
        (previousAssessment?.scores.riskAppetite ?? assessment.scores.riskAppetite),
    ),
    stabilityWeeks: Math.max(stabilityWeeks, 1),
    revisitYes: Math.abs(boldnessDelta) >= 6 || hiringWindow !== previousHiringWindow,
    tightnessDelta,
    riskDelta,
    curveDelta,
    hiringTrend,
    confidenceLabel: treasury.isLive ? "High" : "Medium",
    inputsComplete: assessment.inputs.every((input) => input.value !== null),
    notchShiftLabel:
      boldnessDelta > 1
        ? `+${Math.max(1, Math.round(boldnessDelta / 3))} notch`
        : boldnessDelta < -1
          ? `${Math.min(-1, Math.round(boldnessDelta / 3))} notch`
          : "+0 notch",
    netDeltaLabel: getNetDeltaLabel(boldnessDelta),
    macroLabel:
      assessment.regime === "EXPANSION" ? "Risk-On / Capital-Loose" : "Risk-Off / Capital-Tight",
  };
};
