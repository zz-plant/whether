import { NextResponse } from "next/server";
import { appendCommittedPostureEvent, buildPostureState } from "../../../lib/report/postureStateSource";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { getPostureDecisionEventRepository } from "../../../lib/storage/postureDecisionEventRepository";

export const runtime = "edge";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/posture-state" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const repository = getPostureDecisionEventRepository();

  const postureState = await buildPostureState({
    recordDate: reportData.treasury.record_date,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
    repository,
  });

  return NextResponse.json({
    postureState,
    generatedAt: new Date().toISOString(),
    degraded: !reportResult.ok,
    backend: repository.backendStatus(),
  });
}

export async function POST() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/posture-state" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, treasury, regimeAlert } = reportData;
  const repository = getPostureDecisionEventRepository();

  if (!assessment.regimeTransition?.committed) {
    return NextResponse.json({ appended: false, reason: "No committed transition for current snapshot.", backend: repository.backendStatus() });
  }

  const appendResult = await appendCommittedPostureEvent({
    recordDate: treasury.record_date,
    sourceIngestedAt: treasury.fetched_at,
    assessment,
    previousRegime: regimeAlert?.previousRegime ?? assessment.regimeTransition?.snapshot.committedState ?? assessment.regime,
    repository,
  });

  return NextResponse.json({
    appended: appendResult.appended,
    event: appendResult.appended ? appendResult.event : null,
    degraded: !reportResult.ok,
    backend: appendResult.backend,
  });
}
