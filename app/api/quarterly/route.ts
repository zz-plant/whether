import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/report/reportData";
import { buildQuarterlySummary, getQuarterLabel } from "../../../lib/summary/quarterlySummary";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const { assessment, treasuryProvenance, recordDateLabel, treasury } = await loadReportData();
  const periodLabel = getQuarterLabel(treasury.record_date) ?? recordDateLabel;
  const summary = buildQuarterlySummary({
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
