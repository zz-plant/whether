import { NextRequest, NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { CLI_QUERIES, parseCliQuery, resolveWeeksWindow } from "../../../../lib/cli/queryContracts";
import { formatConfidencePlainLabel } from "../../../../lib/report/reportFormatting";
import { resolvePublishedConfidence } from "../../../../lib/report/confidence";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const DEFAULT_WINDOW_WEEKS = 12;
const MAX_WINDOW_WEEKS = 52;

export async function GET(request: NextRequest) {
  const query = parseCliQuery(request, CLI_QUERIES.history);
  if (query instanceof NextResponse) return query;

  const weeksParam = resolveWeeksWindow({
    weeks: query.weeks,
    defaultWeeks: DEFAULT_WINDOW_WEEKS,
    maxWeeks: MAX_WINDOW_WEEKS,
  });

  const reportResult = await loadReportDataSafe(query.asOf, { route: "/api/cli/history" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const confidenceLabel = formatConfidencePlainLabel(
    resolvePublishedConfidence({
      assessment: reportData.assessment,
      record: reportData.treasury,
      historical: Boolean(reportData.historicalSelection),
    }).label,
  );
  const trend = reportData.reportDynamics.directionLabel;

  const history = reportData.regimeSeries.slice(-weeksParam.windowWeeks).reverse().map((entry) => ({
    recordDate: entry.recordDate,
    regime: entry.regime,
    confidenceLabel,
    trend,
  }));

  return NextResponse.json({
    version: "v1",
    generatedAt: new Date().toISOString(),
    windowWeeks: history.length,
    requestedWeeks: weeksParam.requestedWeeks,
    maxWeeks: MAX_WINDOW_WEEKS,
    truncatedToMax: weeksParam.truncatedToMax,
    history,
    degraded: !reportResult.ok,
  });
}
