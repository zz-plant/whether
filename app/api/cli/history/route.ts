import { NextRequest, NextResponse } from "next/server";
import { buildReportDynamics, loadReportDataSafe } from "../../../../lib/report/reportData";
import { findTimeMachineGovernedAssessment } from "../../../../lib/timeMachine/timeMachineCache";
import { CLI_QUERIES, parseCliQuery, resolveWeeksWindow } from "../../../../lib/cli/queryContracts";
import { formatConfidencePlainLabel } from "../../../../lib/report/reportFormatting";
import { resolvePublishedConfidence } from "../../../../lib/report/confidence";
import { monthEndComparisonReading } from "../../../../lib/report/weekComparison";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const DEFAULT_WINDOW_WEEKS = 52;
const MAX_WINDOW_WEEKS = 52;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/*
 * Each month-end on the record in the last `weeks` weeks, counted back from the newest
 * month-end the report reads, newest first. A row is what that month's own brief publishes
 * (`?asOf=` the same month): its margin from its governed assessment, and its trend against
 * the month-end before it, through the brief's own `buildReportDynamics`.
 *
 * Until 2026-10-27 every row printed this week's margin and trend, and `weeks` counted rows,
 * so `weeks=12` returned a year. The default moved from 12 to 52 with it, so a request
 * without `weeks` returns the same twelve month-ends it always did.
 */
export async function GET(request: NextRequest) {
  const query = parseCliQuery(request, CLI_QUERIES.history);
  if (query instanceof NextResponse) return query;

  const weeksParam = resolveWeeksWindow({
    weeks: query.weeks,
    defaultWeeks: DEFAULT_WINDOW_WEEKS,
    maxWeeks: MAX_WINDOW_WEEKS,
  });

  const reportResult = await loadReportDataSafe(query.asOf, { route: "/api/cli/history" });
  const { regimeSeries, thresholds } = reportResult.ok ? reportResult.data : reportResult.fallback;
  const newest = regimeSeries.at(-1);
  const windowStart = newest ? Date.parse(newest.recordDate) - weeksParam.windowWeeks * WEEK_MS : 0;

  /* The series is a slice of the walk these assessments are memoized from, under the same
     thresholds, so every month-end in it has one. */
  const monthEnds = regimeSeries.flatMap((entry) => {
    const assessment = findTimeMachineGovernedAssessment(entry.recordDate, thresholds);
    return assessment ? [{ recordDate: entry.recordDate, assessment }] : [];
  });

  const history = monthEnds
    .map((monthEnd, index) => ({ ...monthEnd, previous: index > 0 ? monthEnds[index - 1] : undefined }))
    .filter(({ recordDate }) => Date.parse(recordDate) > windowStart)
    .reverse()
    .map(({ recordDate, assessment, previous }) => ({
      recordDate,
      regime: assessment.regime,
      confidenceLabel: formatConfidencePlainLabel(resolvePublishedConfidence({ assessment, historical: true }).label),
      trend: buildReportDynamics({
        current: assessment,
        previous: previous ? monthEndComparisonReading({ record_date: previous.recordDate }, previous.assessment) : null,
      }).directionLabel,
    }));

  return NextResponse.json({
    version: "v1",
    generatedAt: new Date().toISOString(),
    windowWeeks: weeksParam.windowWeeks,
    requestedWeeks: weeksParam.requestedWeeks,
    maxWeeks: MAX_WINDOW_WEEKS,
    truncatedToMax: weeksParam.truncatedToMax,
    history,
    degraded: !reportResult.ok,
  });
}
