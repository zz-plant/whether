import type { RegimeAssessment, RegimeChangeReason } from "./regimeEngine";
import { buildRegimeChangeReasons } from "./regimeEngineDiagnostics";
import { applyConfidenceGate, buildDecisionDeltaRules } from "./alerts/decisionDeltaRules";
import { getRegimeAlertRepository } from "./storage/regimeAlertRepository";

export type AlertChannel = "slack" | "email" | "webhook";

export type AlertGate = "pass" | "downgrade" | "suppressed";

export type DecisionDelta = {
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

export type DecisionTriggerState = {
  crossed: boolean;
  sustainedPeriods: number;
};

export type SignalAlertPayload = {
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
          message: `${delta.actionText} Trigger ${delta.triggerValue.toFixed(2)} vs ${delta.thresholdLabel} ${delta.thresholdValue.toFixed(2)}. ${delta.reversalText}`,
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

export const buildRegimeAlertPayload = (
  previousAssessment: RegimeAssessment,
  currentAssessment: RegimeAssessment,
  previousRecordDate: string,
  currentRecordDate: string,
  timeMachineHref: string,
): SignalAlertPayload => {
  const reasons = buildRegimeChangeReasons(previousAssessment, currentAssessment);
  return buildSignalAlertPayload({
    previousRecordDate,
    currentRecordDate,
    previousAssessment,
    currentAssessment,
    reasons,
    sourceUrls: [],
    timeMachineHref,
  });
};

export const writeRegimeTransitionAlert = async (
  previousAssessment: RegimeAssessment | null,
  currentAssessment: RegimeAssessment,
  previousRecordDate: string | undefined,
  currentRecordDate: string,
  timeMachineHref: string,
): Promise<boolean> => {
  if (!previousAssessment) return false;
  if (currentAssessment.regime === previousAssessment.regime) return false;
  const committed = currentAssessment.regimeTransition?.committed ?? true;
  if (!committed) return false;

  const repository = getRegimeAlertRepository();
  const latest = await repository.latestAlert();

  const payload = buildRegimeAlertPayload(
    previousAssessment,
    currentAssessment,
    previousRecordDate ?? previousAssessment.scores.baseRate.toString(),
    currentRecordDate,
    timeMachineHref,
  );

  if (!shouldCreateSignalAlert(payload, latest ?? undefined)) return false;

  const logEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    eventId: crypto.randomUUID(),
    sourceVersion: "v1",
    canonicalTimestampSource: "request-received-at" as const,
    payload,
  };

  await repository.appendAlert(logEntry);
  return true;
};

export const buildWeeklyDigest = (alerts: RegimeAlertEvent[]) => {
  const latest = alerts[0];
  const previous = alerts[1];

  if (!latest) {
    return {
      summary: "No regime-change alerts this week.",
      bullets: ["Evidence updated with no threshold crossings."],
    };
  }

  const currentScores = latest.payload.currentAssessment.scores;
  const previousScores = previous?.payload.currentAssessment.scores;
  const tightnessDelta = previousScores ? currentScores.tightness - previousScores.tightness : 0;
  const riskDelta = previousScores ? currentScores.riskAppetite - previousScores.riskAppetite : 0;

  return {
    summary: `${latest.payload.currentAssessment.regime} regime as of ${latest.payload.currentRecordDate}.`,
    bullets: [
      `Tightness delta: ${tightnessDelta >= 0 ? "+" : ""}${tightnessDelta.toFixed(2)}.`,
      `Risk appetite delta: ${riskDelta >= 0 ? "+" : ""}${riskDelta.toFixed(2)}.`,
      ...latest.payload.decisionDeltas.map(
        (delta) => `${delta.decisionArea}: ${delta.actionText} Reversal: ${delta.reversalText}`,
      ),
    ],
  };
};
