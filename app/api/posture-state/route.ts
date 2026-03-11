import { NextResponse } from "next/server";
import { recordCommittedPostureDecisionEvent } from "../../../lib/report/postureStateSource";
import { loadReportDataSafe } from "../../../lib/report/reportData";

export const runtime = "edge";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/posture-state" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  const postureState = recordCommittedPostureDecisionEvent({
    recordDate: reportData.treasury.record_date,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
    previousRegime: reportData.regimeAlert?.previousRegime ?? null,
  });

  return NextResponse.json({
    postureState,
    generatedAt: new Date().toISOString(),
    degraded: !reportResult.ok,
  });
}
