import { NextResponse } from "next/server";
import { buildSlackBrief } from "../../../../lib/export/briefBuilders";
import { loadReportData } from "../../../../lib/report/reportData";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const { assessment, treasury, sensors, macroSeries } = await loadReportData();
  const brief = buildSlackBrief(assessment, treasury, sensors, macroSeries);

  return NextResponse.json({
    brief,
    recordDate: treasury.record_date,
    generatedAt: new Date().toISOString(),
    version: "v1",
  });
}
