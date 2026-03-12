import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildWeeklyDigest } from "../../../lib/signalOps";
import { buildPostureState } from "../../../lib/report/postureStateSource";
import { getRegimeAlertRepository } from "../../../lib/storage/regimeAlertRepository";

export const runtime = "edge";

export async function GET() {
  const repository = getRegimeAlertRepository();
  const alertsResult = await repository.listAlerts({ limit: 64 });
  const deliveriesResult = await repository.listDeliveries({ limit: 128 });

  const digest = buildWeeklyDigest(alertsResult.alerts);
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/weekly-digest" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const postureState = await buildPostureState({
    recordDate: reportData.treasury.record_date,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    digest,
    postureState,
    deprecated: {
      alertCount: alertsResult.alerts.length,
      deliveryCount: deliveriesResult.deliveries.length,
      note: "Counts remain for backward compatibility; posture semantics now come from postureState contract.",
    },
    backend: repository.backendStatus(),
  });
}
