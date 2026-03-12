import { NextRequest, NextResponse } from "next/server";
import { buildCliStatusContract, buildCliStatusExpandedContract } from "../../../../lib/cli/contracts";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { buildPostureState } from "../../../../lib/report/postureStateSource";
import { CLI_QUERY_ALLOWLISTS, parseAsOfSearchParam, rejectUnsupportedCliQuery } from "../../../../lib/cli/queryContracts";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const invalidQuery = rejectUnsupportedCliQuery(request, CLI_QUERY_ALLOWLISTS.status);
  if (invalidQuery) return invalidQuery;

  const searchParams = parseAsOfSearchParam(request.nextUrl.searchParams.get("asOf"));
  if (searchParams === null) {
    return NextResponse.json({ error: "Invalid asOf input. Expected YYYY-MM." }, { status: 400 });
  }

  const reportResult = await loadReportDataSafe(searchParams, { route: "/api/cli/status" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const postureState = await buildPostureState({
    recordDate: reportData.treasury.record_date,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });

  const view = request.nextUrl.searchParams.get("view");
  if (view === "expanded") {
    return NextResponse.json(
      buildCliStatusExpandedContract({
        reportData,
        postureState,
        degraded: !reportResult.ok,
      })
    );
  }

  return NextResponse.json(
    buildCliStatusContract({
      reportData,
      postureState,
      degraded: !reportResult.ok,
    })
  );
}
