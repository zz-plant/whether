import { loadReportData } from "../report/reportData";
import { getRegimeProjection } from "../report/regimeContext";
import { getWhetherKv } from "../runtime/kv";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";
import { evaluateFlashMoves, flashInputsFrom, type FlashMove } from "./flashMoves";

type CheckRegimeChangeResult = {
  ok: boolean;
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
  await fetch(webhook, {
    method: "POST",
    body: JSON.stringify({
      blocks: [
        { type: "header", text: { type: "plain_text", text: header } },
        { type: "section", text: { type: "mrkdwn", text: body } },
        { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View brief" }, url: "https://whether.work", action_id: "open_brief" }] },
      ],
    }),
  });
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
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;

  const lastKnown = await kv.get("regime:last-known");
  const prevWeeksToFlip = await kv.get("regime:weeks-to-flip");
  const previousRegime = lastKnown ?? null;
  const alerts: string[] = [];

  /* 1. Regime change — highest priority alert */
  if (previousRegime && previousRegime !== currentRegime) {
    alerts.push(`RECONSIDER OPERATING POSTURE — regime shifted from ${previousRegime} to ${currentRegime}`);
    if (slackWebhook) {
      await postSlackAlert(
        slackWebhook,
        "⚠️ Reconsider Operating Posture",
        `*${previousRegime}* → *${currentRegime}*\nThe assumptions supporting the current posture have moved. Review the weekly brief for updated guidance.`,
      );
    }
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
    if (slackWebhook) {
      await postSlackAlert(
        slackWebhook,
        "⚡ Flash — outsized move since the last read",
        `${move.headline}\nThe weekly call stands until the next read confirms where the scores settle. Hold irreversible commitments until then.`,
      );
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
        await postSlackAlert(
          slackWebhook,
          "👀 Watch Decisions — Flip Window Narrowing",
          `${projection.velocityLabel}\nConditions are approaching a boundary that would change the operating call. Hold irreversible moves until it resolves.`,
        );
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
    ...(flashMoves.length > 0 ? { flashMoves } : {}),
  };
};
