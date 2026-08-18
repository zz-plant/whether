import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../../lib/api/cronAuth";
import { sendWeeklyBrief } from "../../../../lib/email/sendWeeklyBrief";

export const runtime = "edge";

/* POST /api/email/send-weekly — send the weekly brief to all active subscribers.
   The cron trigger calls sendWeeklyBrief() directly (worker/index.ts); this route
   remains for manual/authenticated runs. */
export async function POST(request: Request) {
  try {
    const authError = requireCronAuth(request);
    if (authError) return authError;

    const result = await sendWeeklyBrief();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
