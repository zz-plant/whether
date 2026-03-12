import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../../lib/report/reportData";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const DEFAULT_WINDOW_WEEKS = 12;
const MAX_WINDOW_WEEKS = 52;

const parseWeeksParam = (weeksParam: string | null) => {
  if (weeksParam === null) {
    return { ok: true as const, requestedWeeks: null, windowWeeks: DEFAULT_WINDOW_WEEKS, wasClamped: false };
  }

  const requestedWeeks = Number(weeksParam);
  if (!Number.isInteger(requestedWeeks) || requestedWeeks < 1) {
    return { ok: false as const };
  }

  const windowWeeks = Math.min(requestedWeeks, MAX_WINDOW_WEEKS);
  return { ok: true as const, requestedWeeks, windowWeeks, wasClamped: requestedWeeks !== windowWeeks };
};

export async function GET(request: Request) {
  const parsedWeeks = parseWeeksParam(new URL(request.url).searchParams.get("weeks"));
  if (!parsedWeeks.ok) {
    return NextResponse.json(
      {
        version: "v1",
        generatedAt: new Date().toISOString(),
        error: "Invalid weeks query param. Use a positive integer.",
        windowWeeks: DEFAULT_WINDOW_WEEKS,
        maxWeeks: MAX_WINDOW_WEEKS,
      },
      { status: 400 },
    );
  }

  const reportResult = await loadReportDataSafe(undefined, { route: "/api/cli/history" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;

  return NextResponse.json({
    version: "v1",
    generatedAt: new Date().toISOString(),
    requestedWeeks: parsedWeeks.requestedWeeks,
    windowWeeks: parsedWeeks.windowWeeks,
    maxWeeks: MAX_WINDOW_WEEKS,
    wasClamped: parsedWeeks.wasClamped,
    history: reportData.regimeSeries.slice(-parsedWeeks.windowWeeks).reverse().map((entry) => ({
      recordDate: entry.recordDate,
      regime: entry.regime,
      confidenceLabel: entry.confidenceLabel,
      trend: entry.directionLabel,
    })),
    degraded: !reportResult.ok,
  });
}
