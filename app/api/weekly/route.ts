import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { buildAgentPayload, buildAgentPrompt } from "../../../lib/agentHandoff";
import { buildSummaryHash } from "../../../lib/summary/summaryHash";
import { buildWeeklySummary } from "../../../lib/summary/weeklySummary";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/weekly" });
  const { assessment, macroSeries, sensors, treasury, treasuryProvenance, recordDateLabel } =
    reportResult.ok ? reportResult.data : reportResult.fallback;
  const summary = buildWeeklySummary({
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
    degraded: !reportResult.ok,
  });
}
