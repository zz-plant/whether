import { ENGINE_VERSION, evaluateRegime, type RegimeAssessment, type RegimeThresholds } from "../regimeEngine";
import { getPreviousTimeMachineSnapshot } from "../timeMachine/timeMachineCache";
import { buildComparedWith } from "./comparisonBasis";
import { findWeeklyComparisonReading, observedBaseRate, rescoreStoredInputs, type ComparisonReading } from "./comparisonReading";
import { getPublishedBriefs } from "./publishedBriefs";
import { buildReportDynamics } from "./reportEvidence";
import type { ComparedWith } from "./reportDataTypes";
import type { TreasuryData } from "../types";

type WeekComparisonChoice = { reading: ComparisonReading; comparedWith: ComparedWith | undefined };

/**
 * The previous month-end as a comparison reading: scored by the current engine
 * from the month-end's rates, with the short-term rate only where the month-end
 * observed one (`observedBaseRate`). The loader and the operating snapshot both
 * read the month-end through this.
 */
export const monthEndComparisonReading = (
  snapshot: Pick<TreasuryData, "record_date">,
  assessment: Pick<RegimeAssessment, "regime" | "scores">,
): ComparisonReading => ({
  recordDate: snapshot.record_date,
  regime: assessment.regime,
  scores: { ...assessment.scores, baseRate: observedBaseRate(assessment.scores) },
});

/**
 * Which reading a week is compared with: last week's published brief when one is
 * in range and scored by this engine or re-scorable from its stored inputs
 * (`findWeeklyComparisonReading`), else the previous month-end. One rule for the
 * report loader, which also needs the month-end's movement split for the
 * conditions map and so builds its own month-end, and for the operating snapshot
 * (`resolveWeekComparison`). Until 2026-10-07 each wrote the choice out itself.
 */
export const selectWeekComparison = <MonthEnd extends WeekComparisonChoice>(
  recordDate: string,
  weekly: ComparisonReading | null,
  monthEnd: () => MonthEnd | null,
): WeekComparisonChoice | MonthEnd | null =>
  weekly ? { reading: weekly, comparedWith: buildComparedWith(weekly.recordDate, recordDate) } : monthEnd();

/**
 * The reading a live week is compared with, for the operating snapshot.
 *
 * The operating snapshot builds its weekly call from this. It used to build the
 * call with no comparison at all, so the stored call, which every paste and the
 * Monday send read, could not know the week's direction: it led with the lead
 * area's rule while the page, which compares at read time, led with "Conditions
 * are tightening. Keep only the bets you can stop" (docs/claims-ledger.md).
 */
const resolveWeekComparison = (
  recordDate: string,
  thresholds: RegimeThresholds,
): WeekComparisonChoice | null =>
  selectWeekComparison(
    recordDate,
    findWeeklyComparisonReading(getPublishedBriefs(), recordDate, ENGINE_VERSION, rescoreStoredInputs(evaluateRegime, thresholds)),
    () => {
      const monthEnd = getPreviousTimeMachineSnapshot(recordDate);
      if (!monthEnd) return null;
      return {
        reading: monthEndComparisonReading(monthEnd, evaluateRegime(monthEnd, thresholds)),
        comparedWith: buildComparedWith(monthEnd.record_date, recordDate),
      };
    },
  );

/**
 * A stored reading's comparison and the dynamics built from it. The operating
 * snapshot builds its weekly call from these, and the Monday sends read the same
 * earlier reading when they render the snapshot (`briefSourceFromSnapshot`), so
 * the email and Slack post name the week the call was compared with. They named
 * none until 2026-10-07: the snapshot kept no earlier reading.
 */
export const resolveWeekDynamics = (assessment: RegimeAssessment, recordDate: string) => {
  const comparison = resolveWeekComparison(recordDate, assessment.thresholds);
  return {
    comparison,
    reportDynamics: buildReportDynamics({
      current: assessment,
      previous: comparison?.reading ?? null,
      comparedWith: comparison?.comparedWith,
    }),
  };
};
