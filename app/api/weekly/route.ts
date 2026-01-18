import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/reportData";
import { buildWeeklySummary } from "../../../lib/weeklySummary";

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
    generatedAt: new Date().toISOString(),
    version: "v1",
  });
}
