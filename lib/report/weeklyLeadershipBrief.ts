import type { RegimeAssessment } from "../regimeEngine";
import { comparisonBasis, type ComparisonBasis } from "./comparisonBasis";
import { OPERATING_LATITUDE_LABEL } from "./reportCopy";

type TrendLabel = "Strengthening" | "Flat" | "Cooling";

type WeeklyLeadershipAssessment = Pick<RegimeAssessment, "regime"> & {
  scores: {
    tightness: RegimeAssessment["scores"]["tightness"];
    riskAppetite: RegimeAssessment["scores"]["riskAppetite"];
    curveSlope?: RegimeAssessment["scores"]["curveSlope"];
  };
  inputs?: RegimeAssessment["inputs"];
};

type WeeklyLeadershipBriefInputs = {
  assessment: WeeklyLeadershipAssessment;
  previousAssessment: WeeklyLeadershipAssessment | null;
  last4Boldness: number[];
  hiringTrendDelta: number;
  stabilityWeeks: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Risk appetite's share of operating latitude; the rest is the inverse of funding pressure. */
export const OPERATING_LATITUDE_RISK_WEIGHT = 0.7;

export const buildBoldnessScore = (tightness: number, riskAppetite: number) =>
  clamp(
    Math.round(riskAppetite * OPERATING_LATITUDE_RISK_WEIGHT + (100 - tightness) * (1 - OPERATING_LATITUDE_RISK_WEIGHT)),
    0,
    100,
  );

export const toTrendLabel = (delta: number): TrendLabel => {
  if (delta >= 2) {
    return "Strengthening";
  }
  if (delta <= -2) {
    return "Cooling";
  }
  return "Flat";
};

/**
 * How the operating latitude moved since the earlier reading, said of the number
 * and nothing else. The earlier reading is named by its date where the week
 * records one (`comparisonBasis`): "since Aug 31", or "since last week".
 *
 * It said "The guidance is holding where it was on Aug 31." on a zero move, and
 * "More defensive" otherwise. The latitude is a blend of the two scores, so it
 * can stay flat while one of them crosses a pause line: the sentence then said
 * the guidance held beside guidance that had changed. Whether the guidance
 * changed is `describeGuidanceChange` (`decisionMovement.ts`).
 */
export const getNetDeltaLabel = (delta: number, basis: ComparisonBasis = comparisonBasis()) => {
  if (delta === 0) {
    return `${OPERATING_LATITUDE_LABEL} unchanged ${basis.since}.`;
  }
  const magnitude = Math.abs(delta);
  const size = magnitude >= 12 ? " sharply" : magnitude >= 4 ? "" : " slightly";
  return `${OPERATING_LATITUDE_LABEL} ${delta > 0 ? "up" : "down"}${size} ${basis.since}.`;
};

export const buildWeeklyLeadershipBriefModel = ({
  assessment,
  previousAssessment,
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

  /* No hiring, expansion or fundraising "window" any more. Each graded a score
     against cutoffs no rule publishes (100 minus funding pressure at 38/64, risk
     appetite at 45/65, the boldness move at ±2), and /history/compare, the one
     surface that printed them, showed "Expansion pace: Open" beside "Freeze new
     commitments". It prints each area against its own pause line now
     (`describeAreaPauseStatus`). `revisitYes`, read nowhere, went with the
     hiring window it compared. */
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
    expansionTrend: toTrendLabel(
      assessment.scores.riskAppetite -
        (previousAssessment?.scores.riskAppetite ?? assessment.scores.riskAppetite),
    ),
    stabilityWeeks: Math.max(stabilityWeeks, 1),
    tightnessDelta,
    riskDelta,
    curveDelta,
    hiringTrend,
    inputsComplete: assessment.inputs?.every((input) => input.value !== null) ?? true,
    /* No `steadyWeek`, `notchShiftLabel` or `netDeltaLabel` any more. The first
       drove "nothing changed" copy from this number's move, which can be zero on
       a week a pause line was crossed; the other two were read nowhere. The
       latitude's own sentence is `getNetDeltaLabel`. */
    macroLabel:
      assessment.regime === "EXPANSION" ? "Money cheap and available" : "Money expensive or scarce",
  };
};
