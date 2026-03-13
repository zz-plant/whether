import { NextRequest, NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { CLI_QUERY_ALLOWLIST_BY_ENDPOINT, parseAsOfSearchParam, parseWeeksSearchParam, rejectUnsupportedCliQuery } from "../../../../lib/cli/queryContracts";
import { formatConfidencePlainLabel } from "../../../../lib/report/reportFormatting";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const DEFAULT_WINDOW_WEEKS = 12;
const MAX_WINDOW_WEEKS = 52;

export async function GET(request: NextRequest) {
  const invalidQuery = rejectUnsupportedCliQuery(request, CLI_QUERY_ALLOWLIST_BY_ENDPOINT.history);
  if (invalidQuery) return invalidQuery;

  const searchParams = parseAsOfSearchParam(request.nextUrl.searchParams.get("asOf"));
  if (searchParams === null) {
    return NextResponse.json({ error: "Invalid asOf input. Expected YYYY-MM." }, { status: 400 });
  }

  const weeksParam = parseWeeksSearchParam({
    weeks: request.nextUrl.searchParams.get("weeks"),
    defaultWeeks: DEFAULT_WINDOW_WEEKS,
    maxWeeks: MAX_WINDOW_WEEKS,
  });
  if (weeksParam === null) {
    return NextResponse.json({ error: "Invalid weeks input. Expected integer between 1 and 52." }, { status: 400 });
  }

  const reportResult = await loadReportDataSafe(searchParams, { route: "/api/cli/history" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const confidenceLabel = formatConfidencePlainLabel(
    reportData.assessment.diagnostics.confidence === "MEDIUM" ? "MED" : reportData.assessment.diagnostics.confidence,
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
