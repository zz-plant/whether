import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../../lib/api/cronAuth";
import { sendWeeklyBrief } from "../../../../lib/email/sendWeeklyBrief";
import { resolveEmailBaseUrl } from "../../../../lib/email/publicBaseUrl";
import { forceRequested } from "../../../../lib/delivery/onceFor";

export const runtime = "edge";

/* POST /api/email/send-weekly — send the weekly brief to all active subscribers.
   The cron trigger calls sendWeeklyBrief() directly (worker/index.ts); this route
   remains for manual/authenticated runs. It sends from the stored reading the cron
   writes and refuses when there is none (`refused_unpublishable`), so a manual run
   on a fresh deployment primes the reading first. A subscriber who already has this
   week's brief is skipped (`skipped` in the result) unless `?force=1`. */
export async function POST(request: Request) {
  try {
    const authError = requireCronAuth(request);
    if (authError) return authError;

    const result = await sendWeeklyBrief({ force: forceRequested(request), baseUrl: resolveEmailBaseUrl(request) });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
