import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/report/reportData";
import { buildSummaryHash } from "../../../lib/summary/summaryHash";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";

export const revalidate = 3600;

export async function GET() {
  const { assessment, treasuryProvenance, recordDateLabel } = await loadReportData();
  const summary = buildWeeklySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
  });

  return NextResponse.json({
    summary,
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    summaryHash: buildSummaryHash(summary),
    generatedAt: new Date().toISOString(),
    version: "v1",
  });
}
