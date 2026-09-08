import type { RegimeAssessment } from "../regimeEngine";

export type DecisionArea = "posture" | "hiring" | "spend" | "risk";
export type ConfidenceLevel = RegimeAssessment["diagnostics"]["confidence"];

export type DecisionDeltaRule = {
  code: string;
  decisionArea: DecisionArea;
  action: string;
  thresholdLabel: string;
  thresholdValue: number;
  reversal: string;
  metricValue: number;
  crossed: boolean;
  direction: "up" | "down";
  severe: boolean;
};

const confidenceRank: Record<ConfidenceLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

export const MIN_ALERT_CONFIDENCE: ConfidenceLevel = "MEDIUM";

const isConfidenceBelowMinimum = (confidence: ConfidenceLevel) =>
  confidenceRank[confidence] < confidenceRank[MIN_ALERT_CONFIDENCE];

const crossedAbove = (previous: number, current: number, threshold: number) =>
  previous <= threshold && current > threshold;

const crossedBelow = (previous: number, current: number, threshold: number) =>
  previous > threshold && current <= threshold;

export const buildDecisionDeltaRules = (
  previous: RegimeAssessment,
  current: RegimeAssessment,
): DecisionDeltaRule[] => {
  const rules: DecisionDeltaRule[] = [];

  const tightnessThreshold = current.thresholds.tightnessRegime;
  const riskThreshold = current.thresholds.riskAppetiteRegime;

  const tightnessUp = crossedAbove(previous.scores.tightness, current.scores.tightness, tightnessThreshold);
  const tightnessDown = crossedBelow(previous.scores.tightness, current.scores.tightness, tightnessThreshold);

  if (tightnessUp || tightnessDown) {
    const margin = Math.abs(current.scores.tightness - tightnessThreshold);
    rules.push({
      code: tightnessUp ? "tightness-upshift" : "tightness-downshift",
      decisionArea: "spend",
      action: tightnessUp
        ? "Tighten discretionary spend and hold non-critical hiring reqs."
        : "Loosen budget holds for pre-approved growth bets.",
      thresholdLabel: "Funding pressure regime threshold",
      thresholdValue: tightnessThreshold,
      reversal: tightnessUp
        ? `Re-open spend only if tightness falls back to ${tightnessThreshold} or below for two updates.`
        : `Re-tighten if tightness rises back above ${tightnessThreshold} for two updates.`,
      metricValue: current.scores.tightness,
      crossed: true,
      direction: tightnessUp ? "up" : "down",
      severe: margin >= 10,
    });
  }

  const riskUp = crossedAbove(previous.scores.riskAppetite, current.scores.riskAppetite, riskThreshold);
  const riskDown = crossedBelow(previous.scores.riskAppetite, current.scores.riskAppetite, riskThreshold);

  if (riskUp || riskDown) {
    const margin = Math.abs(current.scores.riskAppetite - riskThreshold);
    rules.push({
      code: riskUp ? "risk-appetite-upshift" : "risk-appetite-downshift",
      decisionArea: "hiring",
      action: riskUp
        ? "Restart paused pipeline roles tied to revenue capacity."
        : "Pause net-new hiring outside committed customer delivery.",
      thresholdLabel: "Risk appetite threshold",
      thresholdValue: riskThreshold,
      reversal: riskUp
        ? `Pause again if risk appetite drops back to ${riskThreshold} or lower for two updates.`
        : `Resume only if risk appetite recovers above ${riskThreshold} for two updates.`,
      metricValue: current.scores.riskAppetite,
      crossed: true,
      direction: riskUp ? "up" : "down",
      severe: margin >= 10,
    });
  }

  if (previous.regime !== current.regime) {
    rules.push({
      code: "regime-change",
      decisionArea: "posture",
      action: `Reset weekly operating posture from ${previous.regime} to ${current.regime}.`,
      thresholdLabel: "Composite regime boundary",
      thresholdValue: 0,
      reversal: "Revert posture only if the prior regime state holds across two consecutive updates.",
      metricValue: 0,
      crossed: true,
      direction: "up",
      severe: true,
    });
  }

  return rules;
};

export const applyConfidenceGate = (
  deltas: DecisionDeltaRule[],
  confidence: ConfidenceLevel,
) => {
  const belowMin = isConfidenceBelowMinimum(confidence);
  if (!belowMin) {
    return deltas.map((delta) => ({ ...delta, gate: "pass" as const }));
  }

  return deltas
    .map((delta) => ({
      ...delta,
      gate: delta.severe ? ("downgrade" as const) : ("suppressed" as const),
    }))
    .filter((delta) => delta.gate !== "suppressed");
};

const AREA_LABEL: Record<DecisionArea, string> = {
  posture: "operating posture",
  hiring: "hiring",
  spend: "spending",
  risk: "risk appetite",
};

/**
 * Decision-alert headline. The analysis's good surface names the decision the
 * alert affects ("RECONSIDER Q4 HIRING"), not the raw signal move ("10Y yield
 * crossed 4.2%"). This maps a decision-delta rule to that verdict headline.
 */
export const buildDecisionVerdictHeadline = (
  delta: Pick<DecisionDeltaRule, "decisionArea" | "severe">,
): string => {
  const area = AREA_LABEL[delta.decisionArea] ?? "operating posture";
  return delta.severe
    ? `RECONSIDER ${area.toUpperCase()}`
    : `WATCH ${area.toUpperCase()}`;
};
