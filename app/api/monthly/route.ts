import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/reportData";
import { buildMonthlySummary } from "../../../lib/monthlySummary";

export const revalidate = 3600;

export async function GET() {
  const { assessment, treasuryProvenance, recordDateLabel } = await loadReportData();
  const summary = buildMonthlySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
  });
  const summaryHash = createHash("sha256")
    .update(JSON.stringify(summary))
    .digest("hex");

  return NextResponse.json({
    summary,
    summaryHash,
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    generatedAt: new Date().toISOString(),
    version: "v1",
  });
}
