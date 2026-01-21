import { NextResponse } from "next/server";
import { buildCadenceAlignment } from "../../../lib/cadenceAlignment";
import { buildMonthlySummary } from "../../../lib/monthlySummary";
import { loadReportData } from "../../../lib/reportData";
import { buildWeeklySummary } from "../../../lib/weeklySummary";

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
  const alignment = buildCadenceAlignment(weeklySummary, monthlySummary);

  return NextResponse.json({
    weeklySummary,
    monthlySummary,
    alignmentStatus: alignment.status,
    mismatchedConstraints: alignment.mismatchedConstraints,
    generatedAt: new Date().toISOString(),
    version: "v1",
  });
}
