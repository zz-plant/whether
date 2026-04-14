import { buildVersionedApiEnvelope, jsonResponse } from "../../../../lib/api/edgeResponse";
import { buildSlackBrief } from "../../../../lib/export/briefBuilders";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { buildPostureState } from "../../../../lib/report/postureStateSource";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/brief/slack" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, treasury, sensors, macroSeries } = reportData;
  const postureState = await buildPostureState({
    recordDate: treasury.record_date,
    assessment,
    reportDynamics: reportData.reportDynamics,
  });
  const brief = buildSlackBrief(assessment, treasury, sensors, macroSeries, { postureState });

  return jsonResponse(
    buildVersionedApiEnvelope({
      brief,
      recordDate: treasury.record_date,
      generatedAt: new Date().toISOString(),
      version: "v1",
      postureState,
      degraded: !reportResult.ok,
    }),
  );
}
