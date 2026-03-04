import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/report/reportData";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";
import { buildSummaryDelta } from "../../../lib/summary/summaryDelta";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";

export { edgeRuntime as runtime } from "../../../lib/next-runtime";
export const revalidate = 3600;

export async function GET() {
  const { assessment, treasuryProvenance, recordDateLabel } = await loadReportData();
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
  });
}
