import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildWeeklyDigest } from "../../../lib/signalOps";
import { serverStore } from "../../../lib/serverStore";
import { recordCommittedPostureDecisionEvent } from "../../../lib/report/postureStateSource";

export const runtime = "edge";

export async function GET() {
  const digest = buildWeeklyDigest(serverStore.snapshot.regimeAlerts);
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/weekly-digest" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const postureState = recordCommittedPostureDecisionEvent({
    recordDate: reportData.treasury.record_date,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
    previousRegime: reportData.regimeAlert?.previousRegime ?? null,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    digest,
    postureState,
    deprecated: {
      alertCount: serverStore.snapshot.regimeAlerts.length,
      deliveryCount: serverStore.snapshot.alertDeliveries.length,
      note: "Counts remain for backward compatibility; posture semantics now come from postureState contract.",
    },
  });
}
