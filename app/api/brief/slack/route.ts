import { NextResponse } from "next/server";
import { buildSlackBrief } from "../../../../lib/export/briefBuilders";
import { loadReportDataSafe } from "../../../../lib/report/reportData";
import { buildHomeBriefModel } from "../../../../lib/report/homeBriefModel";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/brief/slack" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const { assessment, treasury, sensors, macroSeries } = reportData;
  const homeBriefModel = buildHomeBriefModel(reportData);
  const brief = buildSlackBrief(assessment, treasury, sensors, macroSeries, {
    postureWithStageLabel: homeBriefModel.postureWithStageLabel,
    operatingStanceLine: homeBriefModel.operatingStanceLine,
    trendLabel: homeBriefModel.trendLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    regimeDistancePoints: homeBriefModel.regimeDistance.pointsToFlip,
    actionStripItems: homeBriefModel.actionStripItems,
    failureModes: homeBriefModel.failureModes,
    historicalAnalogs: homeBriefModel.historicalAnalogs,
    briefingSummaryParagraph: homeBriefModel.briefingSummary.paragraph,
  });

  return NextResponse.json({
    brief,
    recordDate: treasury.record_date,
    generatedAt: new Date().toISOString(),
    version: "v1",
    degraded: !reportResult.ok,
  });
}
