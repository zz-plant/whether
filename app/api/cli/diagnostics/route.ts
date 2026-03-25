import { NextRequest, NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { CLI_QUERY_ALLOWLIST_BY_ENDPOINT } from "../../../../lib/cli/queryContracts";
import { parseCliRouteRequest } from "../../../../lib/api/cliRoute";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsedRequest = parseCliRouteRequest(request, CLI_QUERY_ALLOWLIST_BY_ENDPOINT.diagnostics);
  if (parsedRequest instanceof NextResponse) return parsedRequest;

  const searchParams = parsedRequest.asOf
    ? { year: String(parsedRequest.asOf.year), month: String(parsedRequest.asOf.month) }
    : undefined;

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
