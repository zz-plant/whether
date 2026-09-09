import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../../../lib/api/cronAuth";
import { deliverSlackBrief } from "../../../../../lib/slack/deliverSlackBrief";

export const runtime = "edge";

/* POST /api/brief/slack/deliver — push the weekly brief to configured Slack
   webhooks. The Monday cron calls deliverSlackBrief() directly (worker/index.ts);
   this route exists for manual/authenticated runs, mirroring email/send-weekly. */
export async function POST(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  const result = await deliverSlackBrief();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
