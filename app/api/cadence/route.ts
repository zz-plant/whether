import { NextResponse } from "next/server";
import { buildCadenceAlignment } from "../../../lib/cadenceAlignment";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/cadence" });
  const { assessment, treasury, treasuryProvenance, recordDateLabel } = reportResult.ok ? reportResult.data : reportResult.fallback;
  // The record date, as /api/weekly passes it; this passed the week-ending Friday.
  const weeklySummary = buildWeeklySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
    record: treasury,
  });
  const monthlySummary = buildMonthlySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
    record: treasury,
  });
  const alignment = buildCadenceAlignment(weeklySummary, monthlySummary);

  return NextResponse.json({
    weeklySummary,
    monthlySummary,
    alignmentStatus: alignment.status,
    mismatchedConstraints: alignment.mismatchedConstraints,
    generatedAt: new Date().toISOString(),
    version: "v1",
    degraded: !reportResult.ok,
  });
}
