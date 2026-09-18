import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../lib/api/cronAuth";
import { runMonthEndPulse } from "../../../lib/alert/monthEndPulse";

export const runtime = "edge";

/* POST /api/month-end-pulse — fires the month-end pulse (once per month, only
   when the reading differs from the prior month-end). The cron trigger calls
   runMonthEndPulse() directly (worker/index.ts); this route remains for
   manual/authenticated runs. */
export async function POST(request: Request) {
  try {
    const authError = requireCronAuth(request);
    if (authError) return authError;

    const result = await runMonthEndPulse();
    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "KV not available" ? 503 : 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}