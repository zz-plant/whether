import { NextRequest, NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { CLI_QUERY_ALLOWLISTS, parseAsOfSearchParam, rejectUnsupportedCliQuery } from "../../../../lib/cli/queryContracts";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const invalidQuery = rejectUnsupportedCliQuery(request, CLI_QUERY_ALLOWLISTS.diagnostics);
  if (invalidQuery) return invalidQuery;

  const searchParams = parseAsOfSearchParam(request.nextUrl.searchParams.get("asOf"));
  if (searchParams === null) {
    return NextResponse.json({ error: "Invalid asOf input. Expected YYYY-MM." }, { status: 400 });
  }

  const reportResult = await loadReportDataSafe(searchParams, { route: "/api/cli/diagnostics" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  return NextResponse.json({
    version: "v1",
    generatedAt: new Date().toISOString(),
    topDrivers: reportData.reportEvidenceItems.slice(0, 10).map((item) => ({
      title: item.title,
      confidenceLabel: item.confidenceLabel,
      directionLabel: item.directionLabel,
      immediateImplication: item.immediateImplication,
    })),
    degraded: !reportResult.ok,
  });
}
