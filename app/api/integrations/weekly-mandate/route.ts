import { NextResponse } from "next/server";
import { loadReportData } from "../../../../lib/report/reportData";
import {
  buildWeeklyMandatePayload,
  integrationTargets,
  parseIntegrationTarget,
} from "../../../../lib/integrationBriefs";

export { edgeRuntime as runtime } from "../../../../lib/next-runtime";

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

  const { assessment, treasury } = await loadReportData();

  return NextResponse.json({
    target,
    recordDate: treasury.record_date,
    payload: buildWeeklyMandatePayload(target, assessment, treasury),
  });
}
