import type { RegimeAssessment, RegimeChangeReason } from "./regimeEngine";

export type AlertChannel = "slack" | "email" | "webhook";

export type SignalAlertPayload = {
  previousRecordDate: string;
  currentRecordDate: string;
  previousAssessment: RegimeAssessment;
  currentAssessment: RegimeAssessment;
  reasons: RegimeChangeReason[];
  sourceUrls: string[];
  timeMachineHref: string;
};

export type RegimeAlertEvent = {
  id: string;
  createdAt: string;
  payload: SignalAlertPayload;
};

export type AlertDeliveryEvent = {
  id: string;
  alertId: string;
  channel: AlertChannel;
  deliveredAt: string;
  status: "sent" | "skipped";
  summary: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const shouldCreateSignalAlert = (
  payload: SignalAlertPayload,
  latestAlert?: RegimeAlertEvent
) => {
  const hasRequiredTrigger = payload.reasons.some((reason) =>
    [
      "regime-change",
      "tightness-upshift",
      "tightness-downshift",
      "risk-appetite-upshift",
      "risk-appetite-downshift",
    ].includes(reason.code)
  );

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

  if (withinCooldown && !regimeFlippedAgain) {
    return false;
  }

  return true;
};

export const buildDeliverySummary = (alert: RegimeAlertEvent) => {
  const reasons = alert.payload.reasons.map((reason) => reason.code).join(", ");
  return `${alert.payload.currentAssessment.regime} (${alert.payload.currentRecordDate}) · ${reasons}`;
};

export const buildWeeklyDigest = (alerts: RegimeAlertEvent[]) => {
  const latest = alerts[0];
  const previous = alerts[1];

  if (!latest) {
    return {
      summary: "No regime-change alerts this week.",
      bullets: ["Signals updated with no threshold crossings."],
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
      ...latest.payload.reasons.map((reason) => `${reason.code}: ${reason.message}`),
    ],
  };
};
