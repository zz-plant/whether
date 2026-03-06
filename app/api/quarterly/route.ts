import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildQuarterlySummary, getQuarterLabel } from "../../../lib/summary/quarterlySummary";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/quarterly" });
  const { assessment, treasuryProvenance, recordDateLabel, treasury } = reportResult.ok ? reportResult.data : reportResult.fallback;
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
    degraded: !reportResult.ok,
  });
}
