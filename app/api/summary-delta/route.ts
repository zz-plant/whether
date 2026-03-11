import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";
import { buildSummaryDelta } from "../../../lib/summary/summaryDelta";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";
import { recordCommittedPostureDecisionEvent } from "../../../lib/report/postureStateSource";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/summary-delta" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, treasuryProvenance, recordDateLabel, treasury } = reportData;
  const weeklySummary = buildWeeklySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
  });
  const monthlySummary = buildMonthlySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
  });
  const delta = buildSummaryDelta(weeklySummary, monthlySummary);
  const postureState = recordCommittedPostureDecisionEvent({
    recordDate: treasury.record_date,
    assessment,
    reportDynamics: reportData.reportDynamics,
    previousRegime: reportData.regimeAlert?.previousRegime ?? null,
  });

  return NextResponse.json({
    delta,
    summaries: {
      weekly: weeklySummary,
      monthly: monthlySummary,
    },
    postureState,
    deprecated: {
      note: "Use postureState.currentState, postureState.lastCommittedChangeEvent, and postureState.whatFlipsNext for canonical posture semantics.",
    },
    generatedAt: new Date().toISOString(),
    version: "v2",
    degraded: !reportResult.ok,
  });
}
