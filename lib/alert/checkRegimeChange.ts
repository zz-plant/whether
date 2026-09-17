import { loadReportData } from "../report/reportData";
import { getRegimeProjection } from "../report/regimeContext";
import { getWhetherKv } from "../runtime/kv";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";
import { siteUrl } from "../siteUrl";
import { sendRegimeChangePush } from "../push/sendRegimePush";

type CheckRegimeChangeResult = {
  ok: boolean;
  /**
   * What the browser notifications did, when the regime moved. Absent on a run
   * where it did not — reporting "0 sent" for a week nothing happened is the
   * cron step that claims success for work it never observed.
   */
  push?: { sent: number; pruned: number; failed: number; reason?: string };
  error?: string;
  previousRegime?: string | null;
  currentRegime?: string;
  changed?: boolean;
  weeksToFlip?: number | null;
  velocityLabel?: string;
  alerts?: string[];
};

/**
 * Check regime, distance-to-flip velocity, and confidence against KV last-known state,
 * pushing Slack alerts on transitions. Shared by the cron trigger (direct call from
 * worker/index.ts) and POST /api/check-regime-change, projecting the authoritative OperatingSnapshot.
 */
export const checkRegimeChange = async (options?: {
  snapshot?: OperatingSnapshot;
  weeklyCall?: WeeklyCallContract;
}): Promise<CheckRegimeChangeResult> => {
  const kv = getWhetherKv();
  if (!kv) return { ok: false, error: "KV not available" };

  let assessment;
  let reportDynamics;

  if (options?.snapshot) {
    assessment = options.snapshot.assessment;
  } else {
    const stored = await getOperatingSnapshotStore().readLatest();
    if (stored) {
      assessment = stored.assessment;
    } else {
      const data = await loadReportData({});
      assessment = data.assessment;
      reportDynamics = data.reportDynamics;
    }
  }
  const currentRegime = assessment.regime;
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;

  const lastKnown = await kv.get("regime:last-known");
  const prevWeeksToFlip = await kv.get("regime:weeks-to-flip");
  const previousRegime = lastKnown ?? null;
  const alerts: string[] = [];
  let pushOutcome: Awaited<ReturnType<typeof sendRegimeChangePush>> | null = null;

  /* 1. Regime change — highest priority alert */
  if (previousRegime && previousRegime !== currentRegime) {
    alerts.push(`RECONSIDER OPERATING POSTURE — regime shifted from ${previousRegime} to ${currentRegime}`);
    /*
     * Here and nowhere else. A notification that fires on every cron run,
     * whether or not anything happened, is one people turn off — and then the
     * one that mattered never arrives. This is the only branch that knows the
     * published regime actually moved.
     *
     * Not awaited into the result and never allowed to throw: a push service
     * being slow or down must not fail the regime check, which has KV state to
     * write after this.
     */
    pushOutcome = await sendRegimeChangePush().catch(() => null);
    if (slackWebhook) {
      await fetch(slackWebhook, {
        method: "POST",
        body: JSON.stringify({
          blocks: [
            { type: "header", text: { type: "plain_text", text: "⚠️ Reconsider Operating Posture" } },
            { type: "section", text: { type: "mrkdwn", text: `*${previousRegime}* → *${currentRegime}*\nThe assumptions supporting the current posture have moved. Review the weekly brief for updated guidance.` } },
            { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View brief" }, url: siteUrl, action_id: "open_brief" }] },
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
      alerts.push(`WATCH DECISIONS — flip window narrowing: ${projection.velocityLabel}`);
      if (slackWebhook) {
        await fetch(slackWebhook, {
          method: "POST",
          body: JSON.stringify({
            blocks: [
              { type: "header", text: { type: "plain_text", text: "👀 Watch Decisions — Flip Window Narrowing" } },
              { type: "section", text: { type: "mrkdwn", text: `${projection.velocityLabel}\nConditions are approaching a boundary that would change the operating call. Hold irreversible moves until it resolves.` } },
              { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View brief" }, url: siteUrl, action_id: "open_brief" }] },
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

  return {
    ok: true,
    previousRegime,
    currentRegime,
    changed: previousRegime !== null && previousRegime !== currentRegime,
    weeksToFlip: projection.weeksToFlip,
    velocityLabel: projection.velocityLabel,
    alerts: alerts.length > 0 ? alerts : undefined,
    /* Absent on a run where the regime did not move, rather than a cheerful
       "0 sent": a step that reports on work it did not do gets read as
       evidence that it did it. */
    push: pushOutcome
      ? { sent: pushOutcome.sent, pruned: pushOutcome.pruned, failed: pushOutcome.failed, reason: pushOutcome.reason }
      : undefined,
  };
};
