import { NextResponse } from "next/server";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import { loadReportData } from "../../../lib/report/reportData";

export const runtime = "edge";

/* POST /api/check-regime-change — checks if the regime changed since last check.
   Stores last-known regime in KV, alerts if different.
   Called by cron or periodically. */
export async function POST(request: Request) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.WHETHER_CRON_SECRET;
    if (expectedToken && authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kv = (globalThis as { WHETHER_DURABLE_KV?: { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> } }).WHETHER_DURABLE_KV;
    if (!kv) return NextResponse.json({ ok: false, error: "KV not available" });

    const { assessment } = await loadReportData({});
    const currentRegime = assessment.regime;

    const lastKnown = await kv.get("regime:last-known");
    const previousRegime = lastKnown ?? null;

    if (previousRegime && previousRegime !== currentRegime) {
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhook) {
        await fetch(slackWebhook, {
          method: "POST",
          body: JSON.stringify({
            blocks: [
              { type: "header", text: { type: "plain_text", text: "⚠️ Regime Change" } },
              { type: "section", text: { type: "mrkdwn", text: `*${previousRegime}* → *${currentRegime}*\nThe operating regime has shifted. Review the weekly brief for updated guidance.` } },
              { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View brief" }, url: "https://whether.work", action_id: "open_brief" }] },
            ],
          }),
        });
      }
    }

    await kv.put("regime:last-known", currentRegime);

    return NextResponse.json({
      ok: true,
      previousRegime,
      currentRegime,
      changed: previousRegime !== null && previousRegime !== currentRegime,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
