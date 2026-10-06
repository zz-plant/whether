import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import {
  buildWeeklyMandatePayload,
  integrationTargets,
  parseIntegrationTarget,
} from "../../../../lib/integrationBriefs";
import { buildPostureState } from "../../../../lib/report/postureStateSource";
import { buildBriefDocumentFromReport } from "../../../../lib/report/briefDocument";

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
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, treasury } = reportData;
  const postureState = await buildPostureState({
    record: treasury,
    assessment,
    reportDynamics: reportData.reportDynamics,
  });
  const document = await buildBriefDocumentFromReport(reportData, { degraded: !reportResult.ok, postureState });

  return NextResponse.json({
    target,
    recordDate: treasury.record_date,
    payload: buildWeeklyMandatePayload(target, document, postureState),
    postureState,
    degraded: !reportResult.ok,
  });
}
