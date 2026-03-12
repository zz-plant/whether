import { NextResponse } from "next/server";
import { appendCommittedPostureEvent, buildPostureState } from "../../../lib/report/postureStateSource";
import { loadReportDataSafe } from "../../../lib/report/reportData";

export const runtime = "edge";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/posture-state" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  const postureState = buildPostureState({
    recordDate: reportData.treasury.record_date,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });

  return NextResponse.json({
    postureState,
    generatedAt: new Date().toISOString(),
    degraded: !reportResult.ok,
  });
}

export async function POST() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/posture-state" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, treasury, regimeAlert } = reportData;

  if (!assessment.regimeTransition.committed) {
    return NextResponse.json({ appended: false, reason: "No committed transition for current snapshot." });
  }

  const appendResult = appendCommittedPostureEvent({
    recordDate: treasury.record_date,
    sourceIngestedAt: treasury.fetched_at,
    assessment,
    previousRegime: regimeAlert?.previousRegime ?? assessment.regimeTransition.snapshot.committedState,
  });

  return NextResponse.json({
    appended: appendResult.appended,
    event: appendResult.appended ? appendResult.event : null,
    degraded: !reportResult.ok,
  });
}
