import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../lib/api/cronAuth";
import { loadCanonicalReportInputs } from "../../../lib/ingestion/materialized";

export const runtime = "edge";

export async function POST(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  try {
    const result = await loadCanonicalReportInputs({});
    if (!result) {
      return NextResponse.json({ ok: false, error: "Ingestion produced no data" }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      treasury: { recordDate: result.treasury.record_date, isLive: result.treasury.isLive },
      macroLive: result.macroSeries.filter((s: { isLive: boolean }) => s.isLive).length,
      macroTotal: result.macroSeries.length,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
