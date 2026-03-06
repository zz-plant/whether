import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";
import { buildSummaryDelta } from "../../../lib/summary/summaryDelta";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/summary-delta" });
  const { assessment, treasuryProvenance, recordDateLabel } = reportResult.ok ? reportResult.data : reportResult.fallback;
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

  return NextResponse.json({
    delta,
    summaries: {
      weekly: weeklySummary,
      monthly: monthlySummary,
    },
    generatedAt: new Date().toISOString(),
    version: "v1",
    degraded: !reportResult.ok,
  });
}
