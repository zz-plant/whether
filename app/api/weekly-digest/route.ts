import { buildVersionedApiEnvelope, jsonResponse } from "../../../lib/api/edgeResponse";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildWeeklyDigest } from "../../../lib/signalOps";
import { buildPostureState } from "../../../lib/report/postureStateSource";
import { getRegimeAlertRepository } from "../../../lib/storage/regimeAlertRepository";

export const runtime = "edge";

export async function GET() {
  const repository = getRegimeAlertRepository();
  const backend = repository.backendStatus();
  const alertsResult = await repository.listAlerts({ limit: 64 });
  const deliveriesResult = await repository.listDeliveries({ limit: 128 });

  const digest = buildWeeklyDigest(alertsResult.alerts);
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/weekly-digest" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const postureState = await buildPostureState({
    record: reportData.treasury,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });
  const degraded = !reportResult.ok || backend === "local-fallback";
  const alertCount = alertsResult.alerts.length;
  const deliveryCount = deliveriesResult.deliveries.length;

  return jsonResponse(
    buildVersionedApiEnvelope({
      digest,
      postureState,
      alertCount,
      deliveryCount,
      degraded,
      backend,
      generatedAt: new Date().toISOString(),
      version: "v1",
      deprecated: {
        alertCount,
        deliveryCount,
        note: "Top-level alertCount and deliveryCount remain canonical; deprecated nested aliases remain temporarily for compatibility while posture semantics come from postureState contract.",
      },
    }),
  );
}
