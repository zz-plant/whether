import { NextResponse } from "next/server";
import { buildSlackBrief } from "../../../../lib/export/briefBuilders";
import { loadReportDataSafe } from "../../../../lib/report/reportData";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/brief/slack" });
  const { assessment, treasury, sensors, macroSeries } = reportResult.ok ? reportResult.data : reportResult.fallback;
  const brief = buildSlackBrief(assessment, treasury, sensors, macroSeries);

  return NextResponse.json({
    brief,
    recordDate: treasury.record_date,
    generatedAt: new Date().toISOString(),
    version: "v1",
    degraded: !reportResult.ok,
  });
}
