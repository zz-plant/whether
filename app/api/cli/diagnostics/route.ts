import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/cli/diagnostics" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  return NextResponse.json({
    version: "v1",
    generatedAt: new Date().toISOString(),
    topDrivers: reportData.reportEvidenceItems.slice(0, 10).map((item) => ({
      title: item.title,
      confidenceLabel: item.confidenceLabel,
      directionLabel: item.directionLabel,
      immediateImplication: item.immediateImplication,
    })),
    degraded: !reportResult.ok,
  });
}
