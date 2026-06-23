import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/health" });
  const { treasury, sourceHealth } = reportResult.ok ? reportResult.data : reportResult.fallback;

  const status = reportResult.ok ? "ok" : "down";
  const statusCode = status === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status,
      service: "whether",
      generatedAt: now.toISOString(),
      version: "v1",
    },
    { status: statusCode },
  );
}
