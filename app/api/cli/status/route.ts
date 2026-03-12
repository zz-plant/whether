import { NextResponse } from "next/server";
import { buildCliStatusContract } from "../../../../lib/cli/contracts";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { buildPostureState } from "../../../../lib/report/postureStateSource";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/cli/status" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const postureState = await buildPostureState({
    recordDate: reportData.treasury.record_date,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });

  return NextResponse.json(
    buildCliStatusContract({
      reportData,
      postureState,
      degraded: !reportResult.ok,
    })
  );
}
