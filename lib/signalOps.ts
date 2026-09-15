import type { RegimeAssessment, RegimeChangeReason } from "./regimeEngine";
import { applyConfidenceGate, buildDecisionDeltaRules, buildDecisionVerdictHeadline } from "./alerts/decisionDeltaRules";

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
    decisionDeltas.length > 0
      ? decisionDeltas.map((delta) => ({
          code: delta.code,
          message: `${buildDecisionVerdictHeadline(delta)}. ${delta.actionText} Trigger ${delta.triggerValue.toFixed(2)} vs ${delta.thresholdLabel} ${delta.thresholdValue.toFixed(2)}. ${delta.reversalText}`,
        }))
      : payload.reasons ?? [{ code: "signals-updated", message: "Signal values updated with no threshold crossing." }];

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

  if (!latest) {
    // alerts[0] is the newest: the event log lists newest-first.
    const lastRecorded = alerts[0];
    return {
      summary: "No regime-change alerts this week.",
      bullets: [
        "Evidence updated with no threshold crossings.",
        ...(lastRecorded
          ? [
              `Last recorded change: ${lastRecorded.payload.currentAssessment.regime} as of ${lastRecorded.payload.currentRecordDate}.`,
            ]
          : []),
      ],
    };
  }

  const currentScores = latest.payload.currentAssessment.scores;
  const previousScores = previous?.payload.currentAssessment.scores;
  const tightnessDelta = previousScores ? currentScores.tightness - previousScores.tightness : 0;
  const riskDelta = previousScores ? currentScores.riskAppetite - previousScores.riskAppetite : 0;

  return {
    summary: `${latest.payload.currentAssessment.regime} regime as of ${latest.payload.currentRecordDate}.`,
    bullets: [
      `Funding pressure delta: ${tightnessDelta >= 0 ? "+" : ""}${tightnessDelta.toFixed(2)}.`,
      `Risk appetite delta: ${riskDelta >= 0 ? "+" : ""}${riskDelta.toFixed(2)}.`,
      ...latest.payload.decisionDeltas.map(
        (delta) => `${buildDecisionVerdictHeadline(delta)} — ${delta.actionText} Reversal: ${delta.reversalText}`,
      ),
    ],
  };
};
