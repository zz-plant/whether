import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/reportData";
import { buildMonthlySummary } from "../../../lib/monthlySummary";
import { buildSummaryHash } from "../../../lib/summaryHash";

export const revalidate = 3600;

export async function GET() {
  const { assessment, treasuryProvenance, recordDateLabel } = await loadReportData();
  const summary = buildMonthlySummary({
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
