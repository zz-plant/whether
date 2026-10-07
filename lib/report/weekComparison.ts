import { ENGINE_VERSION, evaluateRegime, type RegimeThresholds } from "../regimeEngine";
import { getPreviousTimeMachineSnapshot } from "../timeMachine/timeMachineCache";
import { buildComparedWith } from "./comparisonBasis";
import { findWeeklyComparisonReading, observedBaseRate, rescoreStoredInputs, type ComparisonReading } from "./comparisonReading";
import { getPublishedBriefs } from "./publishedBriefs";
import type { ComparedWith } from "./reportDataTypes";

/**
 * The reading a live week is compared with, chosen the way the report loader
 * chooses it, from the same two pieces: last week's published brief when one is
 * in range and scored by this engine or re-scorable from its stored inputs
 * (`findWeeklyComparisonReading`), else the previous month-end, re-scored by the
 * current engine. The loader keeps its own two lines because it also needs the
 * month-end's movement split for the conditions map; tests/weeklyClaimParity
 * holds the two to one answer.
 *
 * The operating snapshot builds its weekly call from this. It used to build the
 * call with no comparison at all, so the stored call, which every paste and the
 * Monday send read, could not know the week's direction: it led with the lead
 * area's rule while the page, which compares at read time, led with "Conditions
 * are tightening. Keep only the bets you can stop" (docs/claims-ledger.md).
 */
export const resolveWeekComparison = (
  recordDate: string,
  thresholds: RegimeThresholds,
): { reading: ComparisonReading; comparedWith: ComparedWith | undefined } | null => {
  const weekly = findWeeklyComparisonReading(
    getPublishedBriefs(),
    recordDate,
    ENGINE_VERSION,
    rescoreStoredInputs(evaluateRegime, thresholds),
  );
  if (weekly) return { reading: weekly, comparedWith: buildComparedWith(weekly.recordDate, recordDate) };

  const monthEnd = getPreviousTimeMachineSnapshot(recordDate);
  if (!monthEnd) return null;
  const assessment = evaluateRegime(monthEnd, thresholds);
  return {
    reading: {
      recordDate: monthEnd.record_date,
      regime: assessment.regime,
      scores: { ...assessment.scores, baseRate: observedBaseRate(assessment.scores) },
    },
    comparedWith: buildComparedWith(monthEnd.record_date, recordDate),
  };
};
