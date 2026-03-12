import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/cli/history" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  return NextResponse.json({
    version: "v1",
    generatedAt: new Date().toISOString(),
    history: reportData.regimeSeries.slice(-12).reverse().map((entry) => ({
      recordDate: entry.recordDate,
      regime: entry.regime,
      confidenceLabel: entry.confidenceLabel,
      trend: entry.directionLabel,
    })),
    degraded: !reportResult.ok,
  });
}
