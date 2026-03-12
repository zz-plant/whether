import { NextRequest, NextResponse } from "next/server";
import { buildCliChangesContract } from "../../../../lib/cli/contracts";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { buildPostureState } from "../../../../lib/report/postureStateSource";
import { CLI_QUERY_ALLOWLIST_BY_ENDPOINT, parseAsOfSearchParam, rejectUnsupportedCliQuery } from "../../../../lib/cli/queryContracts";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const invalidQuery = rejectUnsupportedCliQuery(request, CLI_QUERY_ALLOWLIST_BY_ENDPOINT.changes);
  if (invalidQuery) return invalidQuery;

  const searchParams = parseAsOfSearchParam(request.nextUrl.searchParams.get("asOf"));
  if (searchParams === null) {
    return NextResponse.json({ error: "Invalid asOf input. Expected YYYY-MM." }, { status: 400 });
  }

  const reportResult = await loadReportDataSafe(searchParams, { route: "/api/cli/changes" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const postureState = await buildPostureState({
    recordDate: reportData.treasury.record_date,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });

  return NextResponse.json(
    buildCliChangesContract({
      reportData,
      postureState,
      degraded: !reportResult.ok,
    })
  );
}
