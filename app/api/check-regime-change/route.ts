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
      /* Both are a dependency this run lacks rather than a fault in it: no KV to
         read state from, or no reading it may act on (nothing stored, and the
         report read serving the bundled copy). */
      const unavailable =
        result.error === "KV not available" || (result.error?.startsWith("refused_unpublishable:") ?? false);
      return NextResponse.json(result, { status: unavailable ? 503 : 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
