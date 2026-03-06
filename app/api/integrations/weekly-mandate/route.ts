import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import {
  buildWeeklyMandatePayload,
  integrationTargets,
  parseIntegrationTarget,
} from "../../../../lib/integrationBriefs";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetParam = searchParams.get("target");
  const target = parseIntegrationTarget(targetParam ?? "slack");

  if (!target) {
    return NextResponse.json(
      {
        error: "Invalid integration target.",
        supportedTargets: integrationTargets,
      },
      { status: 400 },
    );
  }

  const reportResult = await loadReportDataSafe(undefined, { route: "/api/integrations/weekly-mandate" });
  const { assessment, treasury } = reportResult.ok ? reportResult.data : reportResult.fallback;

  return NextResponse.json({
    target,
    recordDate: treasury.record_date,
    payload: buildWeeklyMandatePayload(target, assessment, treasury),
    degraded: !reportResult.ok,
  });
}
