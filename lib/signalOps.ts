import type { RegimeAssessment, RegimeChangeReason } from "./regimeEngine";
import { applyConfidenceGate, buildDecisionDeltaRules, buildDecisionVerdictHeadline } from "./alert/decisionDeltaRules";
import { formatDateUTC, formatScoreValue, formatSignedDelta, formatThresholdNumber } from "./formatters";
import { getRegimePublicLabel } from "./regimePresentation";
import { ruleMetricLabel, type RuleConditionMetric } from "./report/boundedDecisionRules";
import { DECISION_CONTRACT_LABELS } from "./report/reportCopy";
import { joinSentences } from "./report/reportFormatting";

type AlertChannel = "slack" | "email" | "webhook";

type AlertGate = "pass" | "downgrade" | "suppressed";

type DecisionDelta = {
  code: string;
  decisionArea: "posture" | "hiring" | "spend" | "risk";
  actionText: string;
  triggerValue: number;
  thresholdLabel: string;
  thresholdValue: number;
  confidence: RegimeAssessment["diagnostics"]["confidence"];
  reversalText: string;
  gate: AlertGate;
  severe: boolean;
};

type DecisionTriggerState = {
  crossed: boolean;
  sustainedPeriods: number;
};

type SignalAlertPayload = {
  previousRecordDate: string;
  currentRecordDate: string;
  previousAssessment: RegimeAssessment;
  currentAssessment: RegimeAssessment;
  reasons: RegimeChangeReason[];
  decisionDeltas: DecisionDelta[];
  triggerStates: Record<string, DecisionTriggerState>;
  sourceUrls: string[];
  timeMachineHref: string;
};

export type SignalAlertInputPayload = Omit<SignalAlertPayload, "decisionDeltas" | "triggerStates" | "reasons"> & {
  reasons?: RegimeChangeReason[];
};

export type RegimeAlertEvent = {
  eventId: string;
  sourceVersion: string;
  canonicalTimestampSource: "request-received-at";
  id: string;
  createdAt: string;
  payload: SignalAlertPayload;
};

export type AlertDeliveryEvent = {
  eventId: string;
  sourceVersion: string;
  canonicalTimestampSource: "request-received-at";
  id: string;
  clientId: string;
  alertId: string;
  channel: AlertChannel;
  deliveredAt: string;
  status: "sent" | "skipped";
  summary: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SUSTAINED_PERIODS = 2;

/**
 * The crossing an alert reports, in the score's name and whole points: "Funding
 * pressure 90 crossed the Spending pause line at 76." It read "Trigger 90.00 vs
 * Spending pause line 76.00" — two decimals on scores published as whole
 * numbers — and on a change of conditions "Trigger 0.00 vs The line where
 * conditions change 0.00", placeholders printed as a reading. A change of
 * conditions crosses no single line, so it says nothing here; its reversal
 * sentence names both lines with their numbers.
 */
const describeCrossing = (delta: { metric?: RuleConditionMetric; metricValue: number; thresholdLabel: string; thresholdValue: number }) =>
  delta.metric
    ? `${ruleMetricLabel[delta.metric]} ${formatScoreValue(delta.metricValue)} crossed the ${delta.thresholdLabel} at ${formatThresholdNumber(delta.thresholdValue)}`
    : "";

export const buildSignalAlertPayload = (
  payload: SignalAlertInputPayload,
  latestAlert?: RegimeAlertEvent,
): SignalAlertPayload => {
  const candidates = buildDecisionDeltaRules(payload.previousAssessment, payload.currentAssessment);
  const gated = applyConfidenceGate(candidates, payload.currentAssessment.diagnostics.confidence);
  const previousStates = latestAlert?.payload.triggerStates ?? {};

  const decisionDeltas: DecisionDelta[] = gated.map((delta) => ({
    code: delta.code,
    decisionArea: delta.decisionArea,
    actionText: delta.action,
    triggerValue: delta.metricValue,
    thresholdLabel: delta.thresholdLabel,
    thresholdValue: delta.thresholdValue,
    confidence: payload.currentAssessment.diagnostics.confidence,
    reversalText: delta.reversal,
    gate: delta.gate,
    severe: delta.severe,
  }));

  const triggerStates = decisionDeltas.reduce<Record<string, DecisionTriggerState>>((acc, delta) => {
    const previous = previousStates[delta.code];
    acc[delta.code] = {
      crossed: true,
      sustainedPeriods: previous?.crossed ? previous.sustainedPeriods + 1 : 1,
    };
    return acc;
  }, {});

  const reasons: RegimeChangeReason[] =
    gated.length > 0
      ? gated.map((delta) => ({
          code: delta.code,
          message: joinSentences(buildDecisionVerdictHeadline(delta), delta.action, describeCrossing(delta), delta.reversal),
        }))
      : payload.reasons ?? [{ code: "signals-updated", message: "Signal values updated; no score crossed a line." }];

  return {
    ...payload,
    reasons,
    decisionDeltas,
    triggerStates,
  };
};

export const shouldCreateSignalAlert = (
  payload: SignalAlertPayload,
  latestAlert?: RegimeAlertEvent
) => {
  const hasRequiredTrigger = payload.decisionDeltas.some((delta) => {
    const state = payload.triggerStates[delta.code];
    return delta.severe || (state?.sustainedPeriods ?? 0) >= MIN_SUSTAINED_PERIODS;
  });

  if (!hasRequiredTrigger) {
    return false;
  }

  if (!latestAlert) {
    return true;
  }

  const nowMs = Date.now();
  const latestMs = Date.parse(latestAlert.createdAt);
  if (Number.isNaN(latestMs)) {
    return true;
  }

  const withinCooldown = nowMs - latestMs < ONE_DAY_MS;
  const regimeFlippedAgain =
    payload.currentAssessment.regime !== latestAlert.payload.currentAssessment.regime;
  const sameDeltaSet =
    payload.decisionDeltas.length === latestAlert.payload.decisionDeltas.length &&
    payload.decisionDeltas.every((delta) =>
      latestAlert.payload.decisionDeltas.some(
        (prior) =>
          prior.code === delta.code &&
          Math.round(prior.triggerValue * 100) === Math.round(delta.triggerValue * 100),
      ),
    );

  if ((withinCooldown && !regimeFlippedAgain) || sameDeltaSet) {
    return false;
  }

  return true;
};

export const buildDeliverySummary = (alert: RegimeAlertEvent) => {
  const deltas = alert.payload.decisionDeltas
    .map((delta) => `${delta.decisionArea}:${delta.code}`)
    .join(", ");
  return `${alert.payload.currentAssessment.regime} (${alert.payload.currentRecordDate}) · ${deltas || "signals-updated"}`;
};

/** A week, in ms. The digest speaks for one week; older alerts are history. */
const WEEKLY_DIGEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Alerts are kept indefinitely, so the newest one in the store can be months
 * old -- the log holds nothing between a threshold crossing and the next one.
 * Summarising it unconditionally is how the weekly digest came to announce a
 * DEFENSIVE call from April while the live posture was EXPANSION in August.
 *
 * Anything older than the window is reported as the last recorded change rather
 * than as this week's call, so the digest can be stale-but-honest but never
 * contradicts the posture the rest of the product is showing.
 */
export const buildWeeklyDigest = (
  alerts: RegimeAlertEvent[],
  options?: { now?: number; windowMs?: number },
) => {
  const now = options?.now ?? Date.now();
  const windowMs = options?.windowMs ?? WEEKLY_DIGEST_WINDOW_MS;
  const thisWeek = alerts.filter((alert) => {
    const createdAt = Date.parse(alert.createdAt);
    return Number.isFinite(createdAt) && now - createdAt <= windowMs;
  });

  const latest = thisWeek[0];
  const previous = thisWeek[1];

  /*
   * In the conditions word and the date every page prints. The digest said
   * "SCARCITY regime as of 2026-10-05", "Last recorded change: SCARCITY" and "No
   * regime-change alerts this week": the engine's key and its name for conditions.
   * A stored alert is not always a change of conditions (a line crossing raises
   * one too), so the history line names the alert and the conditions it read.
   */
  const conditionsOf = (alert: RegimeAlertEvent) =>
    `${getRegimePublicLabel(alert.payload.currentAssessment.regime)} as of ${formatDateUTC(alert.payload.currentRecordDate)}`;

  if (!latest) {
    // alerts[0] is the newest: the event log lists newest-first.
    const lastRecorded = alerts[0];
    return {
      summary: "No alerts this week.",
      bullets: [
        "Evidence updated; no score crossed a line.",
        ...(lastRecorded ? [`Last recorded alert: conditions were ${conditionsOf(lastRecorded)}.`] : []),
      ],
    };
  }

  const currentScores = latest.payload.currentAssessment.scores;
  const previousScores = previous?.payload.currentAssessment.scores;
  /* Whole points, and only against an earlier alert this week. With none, both
     lines printed "+0.00", a move nobody measured. */
  const scoreLine = (label: string, current: number, before: number | undefined) =>
    before === undefined
      ? `${label} ${formatScoreValue(current)}.`
      : `${label} ${formatScoreValue(current)}, ${formatSignedDelta(Math.round(current) - Math.round(before))} points since the previous alert.`;

  return {
    summary: `Conditions are ${conditionsOf(latest)}.`,
    bullets: [
      scoreLine(ruleMetricLabel.tightness, currentScores.tightness, previousScores?.tightness),
      scoreLine(ruleMetricLabel.riskAppetite, currentScores.riskAppetite, previousScores?.riskAppetite),
      ...latest.payload.decisionDeltas.map(
        /* A change of conditions carries its own label ("Conditions change if: …"),
           which read "Reversal: Conditions change if: …" under this one. */
        (delta) =>
          `${buildDecisionVerdictHeadline(delta)} — ${delta.actionText} ${
            delta.reversalText.startsWith(`${DECISION_CONTRACT_LABELS.watch.postureFlips}:`) ? "" : `${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: `
          }${delta.reversalText}`,
      ),
    ],
  };
};
