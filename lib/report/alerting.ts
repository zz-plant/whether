import type { RegimeAssessment } from "../regimeEngine";

export type OperatorAlert = {
  id: string;
  message: string;
  confidence: RegimeAssessment["diagnostics"]["confidence"];
  thresholdCrossed: string;
  createdAt: string;
};

const alertLedger: OperatorAlert[] = [];
const DEBOUNCE_WINDOW_MS = 1000 * 60 * 30;

const isConfidenceEligible = (confidence: RegimeAssessment["diagnostics"]["confidence"]) =>
  confidence === "HIGH" || confidence === "MEDIUM";

const isDebounced = (message: string, now: string) => {
  const last = [...alertLedger].reverse().find((alert) => alert.message === message);
  if (!last) return false;
  return new Date(now).getTime() - new Date(last.createdAt).getTime() < DEBOUNCE_WINDOW_MS;
};

export const emitBoundedAlerts = (assessment: RegimeAssessment, asOf: string) => {
  if (!isConfidenceEligible(assessment.diagnostics.confidence)) {
    return [];
  }

  const alerts: OperatorAlert[] = [];
  if (assessment.scores.tightness > assessment.thresholds.tightnessRegime) {
    alerts.push({
      id: `${asOf}:tighten-hiring`,
      message: "Tighten hiring now",
      confidence: assessment.diagnostics.confidence,
      thresholdCrossed: `tightness>${assessment.thresholds.tightnessRegime}`,
      createdAt: asOf,
    });
  }

  if (assessment.scores.riskAppetite <= assessment.thresholds.riskAppetiteRegime) {
    alerts.push({
      id: `${asOf}:revisit-cac`,
      message: "Revisit CAC payback assumptions",
      confidence: assessment.diagnostics.confidence,
      thresholdCrossed: `riskAppetite<=${assessment.thresholds.riskAppetiteRegime}`,
      createdAt: asOf,
    });
  }

  const novelAlerts = alerts.filter((alert) => !isDebounced(alert.message, asOf));
  alertLedger.push(...novelAlerts);
  return novelAlerts;
};

export const readAlertLedger = () => [...alertLedger];
