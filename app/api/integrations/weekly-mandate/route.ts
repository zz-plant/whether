import { NextResponse } from "next/server";
import { loadReportData } from "../../../../lib/report/reportData";
import { buildWeeklyMandatePayload, type IntegrationTarget } from "../../../../lib/integrationBriefs";

const isIntegrationTarget = (value: string): value is IntegrationTarget =>
  value === "slack" || value === "notion" || value === "linear";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetParam = searchParams.get("target") ?? "slack";
  const target = isIntegrationTarget(targetParam) ? targetParam : "slack";
  const { assessment, treasury } = await loadReportData();

  return NextResponse.json({
    target,
    recordDate: treasury.record_date,
    payload: buildWeeklyMandatePayload(target, assessment, treasury),
  });
}
