import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/report/reportData";
import { buildYearlySummary, getYearLabel } from "../../../lib/summary/yearlySummary";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const { assessment, treasuryProvenance, recordDateLabel, treasury } = await loadReportData();
  const periodLabel = getYearLabel(treasury.record_date) ?? recordDateLabel;
  const summary = buildYearlySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
    periodLabel,
  });

  return NextResponse.json({
    summary,
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    generatedAt: new Date().toISOString(),
    version: "v1",
  });
}
