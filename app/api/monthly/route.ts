import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/report/reportData";
import { buildAgentPayload, buildAgentPrompt } from "../../../lib/agentHandoff";
import { buildMonthlySummary } from "../../../lib/summary/monthlySummary";
import { buildSummaryHash } from "../../../lib/summary/summaryHash";

export { edgeRuntime as runtime } from "../../../lib/next-runtime";
export const revalidate = 3600;

export async function GET() {
  const { assessment, macroSeries, sensors, treasury, treasuryProvenance, recordDateLabel } =
    await loadReportData();
  const summary = buildMonthlySummary({
    assessment,
    provenance: treasuryProvenance,
    recordDateLabel,
  });
  const agentPayload = buildAgentPayload(assessment, treasury, sensors, macroSeries);
  const agentPrompt = buildAgentPrompt(assessment, treasury);

  return NextResponse.json({
    summary,
    copy: summary.copy,
    structured: summary.structured,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    agentHandoff: {
      payload: agentPayload,
      prompt: agentPrompt,
    },
    summaryHash: buildSummaryHash(summary),
    generatedAt: new Date().toISOString(),
    version: "v1",
  });
}
