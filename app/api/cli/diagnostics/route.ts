import { NextRequest, NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { CLI_QUERIES, parseCliQuery } from "../../../../lib/cli/queryContracts";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = parseCliQuery(request, CLI_QUERIES.diagnostics);
  if (query instanceof NextResponse) return query;

  const reportResult = await loadReportDataSafe(query.asOf, { route: "/api/cli/diagnostics" });
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
