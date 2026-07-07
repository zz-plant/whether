import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../lib/api/cronAuth";
import { loadReportData } from "../../../lib/report/reportData";
import { getRegimeProjection } from "../../../lib/report/regimeContext";

export const runtime = "edge";

/* POST /api/check-regime-change — checks regime, distance-to-flip velocity, and confidence.
   Alerts on: regime change, narrowing flip window, or confidence drop.
   Called by cron (Mon 14:00 UTC) and on key signal changes. */
export async function POST(request: Request) {
  try {
    const authError = requireCronAuth(request);
    if (authError) return authError;

    const kv = (globalThis as { WHETHER_DURABLE_KV?: { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> } }).WHETHER_DURABLE_KV;
    if (!kv) return NextResponse.json({ ok: false, error: "KV not available" });

    const { assessment, reportDynamics, actionNowShort } = await loadReportData({});
    const currentRegime = assessment.regime;
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;

    const lastKnown = await kv.get("regime:last-known");
    const prevWeeksToFlip = await kv.get("regime:weeks-to-flip");
    const previousRegime = lastKnown ?? null;
    const alerts: string[] = [];

    /* 1. Regime change — highest priority alert */
    if (previousRegime && previousRegime !== currentRegime) {
      alerts.push(`*${previousRegime}* → *${currentRegime}*\nThe operating regime has shifted.`);
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

    /* 2. Distance-to-flip velocity — alert when narrowing rapidly */
    const tightnessDelta = reportDynamics?.changedSignals?.find((s: { key: string }) => s.key === "tightness")?.delta ?? 0;
    const riskDelta = reportDynamics?.changedSignals?.find((s: { key: string }) => s.key === "riskAppetite")?.delta ?? 0;
    const projection = getRegimeProjection(
      currentRegime,
      assessment.scores.tightness,
      assessment.scores.riskAppetite,
      tightnessDelta,
      riskDelta,
    );

    if (projection.weeksToFlip && projection.weeksToFlip <= 2) {
      const prevWeeks = prevWeeksToFlip ? parseInt(prevWeeksToFlip, 10) : null;
      if (prevWeeks === null || projection.weeksToFlip < prevWeeks) {
        alerts.push(`Flip window narrowing: ${projection.velocityLabel}`);
        if (slackWebhook) {
          await fetch(slackWebhook, {
            method: "POST",
            body: JSON.stringify({
              blocks: [
                { type: "header", text: { type: "plain_text", text: "📊 Flip Window Narrowing" } },
                { type: "section", text: { type: "mrkdwn", text: projection.velocityLabel } },
                { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View brief" }, url: "https://whether.work", action_id: "open_brief" }] },
              ],
            }),
          });
        }
      }
    }

    /* 3. Confidence drop — alert when the data is getting noisier */
    const prevConfidence = await kv.get("regime:confidence");
    const currentConfidence = assessment.diagnostics?.confidence ?? "HIGH";
    if (prevConfidence === "HIGH" && currentConfidence !== "HIGH") {
      alerts.push(`Confidence dropped from ${prevConfidence} to ${currentConfidence}. Data is getting noisier — review thresholds.`);
    }

    /* Persist state for next check */
    await kv.put("regime:last-known", currentRegime);
    await kv.put("regime:weeks-to-flip", String(projection.weeksToFlip ?? ""));
    await kv.put("regime:confidence", currentConfidence);

    return NextResponse.json({
      ok: true,
      previousRegime,
      currentRegime,
      changed: previousRegime !== null && previousRegime !== currentRegime,
      weeksToFlip: projection.weeksToFlip,
      velocityLabel: projection.velocityLabel,
      alerts: alerts.length > 0 ? alerts : undefined,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
