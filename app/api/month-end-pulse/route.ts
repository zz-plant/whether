import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../lib/api/cronAuth";
import { runMonthEndPulse } from "../../../lib/alert/monthEndPulse";
import { resolveEmailBaseUrl } from "../../../lib/email/publicBaseUrl";

export const runtime = "edge";

/* POST /api/month-end-pulse — fires the month-end pulse (once per month, only
   when the reading differs from the prior month-end). The cron trigger calls
   runMonthEndPulse() directly (worker/index.ts); this route remains for
   manual/authenticated runs. */
export async function POST(request: Request) {
  try {
    const authError = requireCronAuth(request);
    if (authError) return authError;

    const result = await runMonthEndPulse({ baseUrl: resolveEmailBaseUrl(request) });
    if (!result.ok) {
      /* A missing KV binding is a dependency the run lacks, not a fault in it. The pulse's
         message goes on to say what that costs, so match its start, not the whole string. */
      return NextResponse.json(result, { status: result.error?.startsWith("KV not available") ? 503 : 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}