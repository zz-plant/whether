import { NextResponse } from "next/server";

export const runtime = "edge";

const loadCanonical = async () => {
  const dynamicImport = new Function("modulePath", "return import(modulePath);") as (
    modulePath: string,
  ) => Promise<typeof import("../../../lib/ingestion/materialized")>;
  const materialized = await dynamicImport("../../../lib/ingestion/materialized");
  return materialized.loadCanonicalReportInputs({});
};

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  const secret = (globalThis as { WHETHER_CRON_SECRET?: string }).WHETHER_CRON_SECRET
    ?? process.env.WHETHER_CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await loadCanonical();
    if (!result) {
      return NextResponse.json({ ok: false, error: "Ingestion produced no data" }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      treasury: { recordDate: result.treasury.record_date, isLive: result.treasury.isLive },
      macroLive: result.macroSeries.filter((s) => s.isLive).length,
      macroTotal: result.macroSeries.length,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
