import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../lib/api/cronAuth";
import { checkRegimeChange } from "../../../lib/alert/checkRegimeChange";

export const runtime = "edge";

/* POST /api/check-regime-change — checks regime, distance-to-flip velocity, and confidence.
   The cron trigger calls checkRegimeChange() directly (worker/index.ts); this route
   remains for manual/authenticated runs. */
export async function POST(request: Request) {
  try {
    const authError = requireCronAuth(request);
    if (authError) return authError;

    const result = await checkRegimeChange();
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
