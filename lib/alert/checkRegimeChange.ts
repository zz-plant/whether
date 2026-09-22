import { getRegimePublicLabel } from "../regimePresentation";
import { loadReportData } from "../report/reportData";
import { getRegimeProjection } from "../report/regimeContext";
import { getWhetherKv } from "../runtime/kv";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";
import { getSlackWebhookStore } from "../slack/slackWebhookStore";
import { isSlackWebhookUrl } from "../slack/deliverSlackBrief";
import { siteUrl } from "../siteUrl";
import { sendRegimeChangePush } from "../push/sendRegimePush";
import { evaluateFlashMoves, flashInputsFrom, type FlashMove } from "./flashMoves";

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
  flashMoves?: FlashMove[];
};

/** One Slack post, in the block shape every alert here uses. */
const postSlackAlert = async (webhook: string, header: string, body: string) => {
  const response = await fetch(webhook, {
    method: "POST",
    body: JSON.stringify({
      blocks: [
        { type: "header", text: { type: "plain_text", text: header } },
        { type: "section", text: { type: "mrkdwn", text: body } },
        { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View brief" }, url: siteUrl, action_id: "open_brief" }] },
      ],
    }),
  });
  /* A webhook Slack has revoked reads 404/410; drop it so the weekly step stops
     counting it as a target. Same rule the weekly deliverer applies. */
  if (response.status === 404 || response.status === 410) {
    getSlackWebhookStore().deactivateByUrl(webhook).catch(() => undefined);
  }
  return response;
};

/**
 * Every Slack target for an alert: the env-configured webhook plus every
 * webhook a channel subscribed through the form (KV store). A regime change or
 * flash reaches the channels that signed up for the weekly brief, not just the
 * operator's own webhook — the flip is the one mid-week event the channel
 * needs, and it is exactly what the form's "a note if the call flips" promises.
 */
const resolveAlertSlackWebhooks = async (): Promise<string[]> => {
  const urls = new Set<string>(resolveConfiguredAlertWebhook());
  try {
    const store = getSlackWebhookStore();
    const stored = await store.listActiveWebhooks();
    for (const url of stored) {
      if (isSlackWebhookUrl(url)) urls.add(url);
    }
  } catch (error) {
    console.warn("[slack-alert] failed to load subscribed webhooks", error);
  }
  return [...urls];
};

const resolveConfiguredAlertWebhook = (): string[] => {
  const envUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  return envUrl && isSlackWebhookUrl(envUrl) ? [envUrl] : [];
};

/** Post an alert to every target, never throwing: a slow Slack post must not
 *  fail the regime check, which has KV state to write after this. */
const postSlackAlerts = async (header: string, body: string) => {
  try {
    const webhooks = await resolveAlertSlackWebhooks();
    if (webhooks.length === 0) return;
    await Promise.allSettled(webhooks.map((webhook) => postSlackAlert(webhook, header, body)));
  } catch (error) {
    console.warn("[slack-alert] delivery failed", error);
  }
};

/**
 * Check regime, distance-to-flip velocity, and confidence against KV last-known state,
 * pushing Slack alerts on transitions. Shared by the cron trigger (direct call from
 * worker/index.ts) and POST /api/check-regime-change, projecting the authoritative OperatingSnapshot.
 */
export const checkRegimeChange = async (options?: {
  snapshot?: OperatingSnapshot;
  weeklyCall?: WeeklyCallContract;
  /** The read before `snapshot`; a flash is judged on consecutive reads only. */
  previousSnapshot?: OperatingSnapshot | null;
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

  const lastKnown = await kv.get("regime:last-known");
  const prevWeeksToFlip = await kv.get("regime:weeks-to-flip");
  const previousRegime = lastKnown ?? null;
  const alerts: string[] = [];
  let pushOutcome: Awaited<ReturnType<typeof sendRegimeChangePush>> | null = null;

  /* 1. Regime change — highest priority alert */
  if (previousRegime && previousRegime !== currentRegime) {
    alerts.push(`The call moved from ${getRegimePublicLabel(previousRegime)} to ${getRegimePublicLabel(currentRegime)}. Read the brief before acting on last week's plan.`);
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
    await postSlackAlerts(
      "⚠️ The call changed",
      `*${getRegimePublicLabel(previousRegime)}* → *${getRegimePublicLabel(currentRegime)}*\nRead this week's call before acting on last week's plan.`,
    );
  }

  /* 1b. Flash — an emergency-sized move in a raw input since the previous read.
     Pushed whether or not a score crossed anything: the point is the day it lands. */
  const flashMoves = options?.snapshot
    ? evaluateFlashMoves(
        flashInputsFrom(options.snapshot),
        options.previousSnapshot ? flashInputsFrom(options.previousSnapshot) : null,
      )
    : [];
  for (const move of flashMoves) {
    alerts.push(`FLASH — ${move.headline}`);
    await postSlackAlerts(
      "⚡ Flash — outsized move since the last read",
      `${move.headline}\nThe weekly call stands until the next read confirms where the scores settle. Hold irreversible commitments until then.`,
    );
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
      alerts.push(`WATCH — the call could change soon: ${projection.velocityLabel}`);
      await postSlackAlerts(
        "👀 The call could change soon",
        `${projection.velocityLabel}\nA score is closing on the line that changes the call. Hold anything you can't undo until it settles.`,
      );
    }
  }

  /* 3. Confidence drop — alert when the data is getting noisier */
  const prevConfidence = await kv.get("regime:confidence");
  const currentConfidence = assessment.diagnostics?.confidence ?? "HIGH";
  if (prevConfidence === "HIGH" && currentConfidence !== "HIGH") {
    alerts.push(`Confidence dropped from ${prevConfidence} to ${currentConfidence}. Sources disagreed this week. Read the call before acting on it.`);
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
    ...(flashMoves.length > 0 ? { flashMoves } : {}),
    /* Absent on a run where the regime did not move, rather than a cheerful
       "0 sent": a step that reports on work it did not do gets read as
       evidence that it did it. */
    push: pushOutcome
      ? { sent: pushOutcome.sent, pruned: pushOutcome.pruned, failed: pushOutcome.failed, reason: pushOutcome.reason }
      : undefined,
  };
};
