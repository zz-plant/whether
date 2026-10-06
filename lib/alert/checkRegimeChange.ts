import { getRegimePublicLabel } from "../regimePresentation";
import { getRegimeProjection } from "../report/regimeContext";
import { getWhetherKv } from "../runtime/kv";
import type { OperatingSnapshot } from "../operatingState/types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import { assessReadingReadiness, resolveOperatingSnapshot } from "../operatingState/resolveSnapshot";
import { slackAlertBlocks, slackChannel } from "../delivery/slack";
import { sendRegimeChangePush } from "../push/sendRegimePush";
import { evaluateFlashMoves, flashInputsFrom, type FlashMove } from "./flashMoves";
import { formatExportConfidenceWord } from "../export/exportTerms";
import { resolvePublishedConfidence } from "../report/confidence";

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

/**
 * Post an alert to every Slack target, never throwing: a slow Slack post must
 * not fail the regime check, which has KV state to write after this.
 *
 * The targets are the env-configured webhook plus every webhook a channel
 * subscribed through the form. A regime change or flash reaches the channels
 * that signed up for the weekly brief, not just the operator's own webhook —
 * the flip is the one mid-week event the channel needs, and it is exactly what
 * the form's "a note if the call flips" promises. A webhook Slack has revoked
 * (404/410) is retired by the shared channel, so the weekly step stops counting
 * it as a target.
 */
const postSlackAlerts = async (header: string, body: string) => {
  try {
    const webhooks = await slackChannel.listTargets();
    if (webhooks.length === 0) return;
    await slackChannel.deliver(webhooks, { blocks: slackAlertBlocks(header, body) });
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

  /* The cron's snapshot, else the stored one, else a report read — the manual
     route's path when nothing is stored. */
  const reading = await resolveOperatingSnapshot({
    given: { snapshot: options?.snapshot, weeklyCall: options?.weeklyCall },
    onMiss: "report",
    route: "check-regime-change",
  });

  /*
   * A report read succeeds on an outage by serving the bundled copy, and this
   * check acted on whatever it got: a manual run with nothing stored judged a
   * months-old saved reading against the last-known regime, posted the "change"
   * to every channel, and wrote `regime:last-known` from it, so the next real
   * reading was compared with the copy. The weekly sends have refused that
   * reading since 2026-09-17; this asks the same question before judging or
   * writing anything.
   */
  if (reading.source === "report") {
    const readiness = assessReadingReadiness(reading, new Date());
    if (!readiness.ok) return { ok: false, error: `refused_unpublishable: ${readiness.reason}` };
  }

  const assessment = reading.source === "report" ? reading.report.assessment : reading.snapshot.assessment;
  const record = reading.source === "report" ? reading.report.treasury : reading.snapshot.treasury;
  const reportDynamics = reading.source === "report" ? reading.report.reportDynamics : undefined;
  const currentRegime = assessment.regime;

  const lastKnown = await kv.get("regime:last-known");
  const prevWeeksToFlip = await kv.get("regime:weeks-to-flip");
  const previousRegime = lastKnown ?? null;
  const alerts: string[] = [];
  let pushOutcome: Awaited<ReturnType<typeof sendRegimeChangePush>> | null = null;

  /* 1. Regime change — highest priority alert */
  if (previousRegime && previousRegime !== currentRegime) {
    alerts.push(`Conditions changed from ${getRegimePublicLabel(previousRegime)} to ${getRegimePublicLabel(currentRegime)}. Read the brief before acting on last week's plan.`);
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
      "⚠️ Conditions changed",
      `*${getRegimePublicLabel(previousRegime)}* → *${getRegimePublicLabel(currentRegime)}*\nRead this week's guidance before acting on last week's plan.`,
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
      "⚡ Flash — an unusually large move since the last reading",
      `${move.headline}\nThis week's guidance stands until the next reading shows where the scores settle. Until then, hold anything you can't undo.`,
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
      alerts.push(`WATCH — conditions could change soon: ${projection.velocityLabel}`);
      await postSlackAlerts(
        "👀 Conditions could change soon",
        `${projection.velocityLabel}\nA score is closing on the line where conditions change. Hold anything you can't undo until it settles.`,
      );
    }
  }

  /* 3. Confidence drop — the published band leaving High, the band every page
     and export prints. This read the engine's own label, which ranks the raw
     gap and so could drop to Medium while the site still said High, and the
     alert gave "sources disagreed" as the reason, which is not what it measures. */
  const prevConfidence = await kv.get("regime:confidence");
  const currentConfidence = resolvePublishedConfidence({ assessment, record }).label;
  if (prevConfidence === "HIGH" && currentConfidence !== "HIGH") {
    alerts.push(
      `Confidence dropped from ${formatExportConfidenceWord(prevConfidence).toLowerCase()} to ${formatExportConfidenceWord(currentConfidence).toLowerCase()}. Read the guidance before acting on it.`,
    );
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
