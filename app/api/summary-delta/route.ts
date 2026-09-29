import { buildVersionedApiEnvelope, jsonResponse } from "../../../lib/api/edgeResponse";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";
import { buildSummaryDelta } from "../../../lib/summary/summaryDelta";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";
import { buildPostureState } from "../../../lib/report/postureStateSource";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/summary-delta" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, treasuryProvenance, recordDateLabel, weeklyRecordDateLabel, treasury } = reportData;
  const weeklySummary = buildWeeklySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel: weeklyRecordDateLabel,
  });
  const monthlySummary = buildMonthlySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
  });
  const delta = buildSummaryDelta(weeklySummary, monthlySummary);
  const postureState = await buildPostureState({
    record: treasury,
    assessment,
    reportDynamics: reportData.reportDynamics,
  });

  return jsonResponse(
    buildVersionedApiEnvelope({
      delta,
      summaries: {
        weekly: weeklySummary,
        monthly: monthlySummary,
      },
      postureState,
      generatedAt: new Date().toISOString(),
      version: "v2",
      degraded: !reportResult.ok,
      deprecated: {
        note: "Use postureState.currentState, postureState.lastCommittedChangeEvent, and postureState.whatFlipsNext for canonical posture semantics.",
      },
    }),
  );
}
