import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/reportData";
import { buildSummaryDiff } from "../../../lib/summaryDiff";
import { updateSummarySnapshot } from "../../../lib/summarySnapshotStore";
import { buildWeeklySummary } from "../../../lib/weeklySummary";

export const revalidate = 3600;

export async function GET() {
  const { assessment, treasuryProvenance, recordDateLabel } = await loadReportData();
  const summary = buildWeeklySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
  });
  const previousSnapshot = updateSummarySnapshot("weekly", {
    regime: summary.regime,
    guidance: summary.guidance,
    constraints: summary.constraints,
  });
  const diff = buildSummaryDiff(
    {
      regime: summary.regime,
      guidance: summary.guidance,
      constraints: summary.constraints,
    },
    previousSnapshot
  );

  return NextResponse.json({
    summary,
    diff,
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    generatedAt: new Date().toISOString(),
    version: "v1",
  });
}
