/**
 * Decision Shield logic for translating market climates into operator-safe verdicts.
 * Produces shareable, plain-English guidance tied to sensor conditions.
 */
import type { RegimeAssessment } from "./regimeEngine";
import { REGIME_REVERSAL_DAYS } from "./regimeEngine";
import {
  DECISION_ACTION_LABELS,
  DECISION_GUARDRAILS,
  DECISION_VERDICT_MATRIX,
} from "./decisionShieldConfig";

export type LifecycleStage = "DISCOVERY" | "GROWTH" | "SCALE" | "MATURE";
export type DecisionCategory =
  | "HIRING"
  | "ROADMAP"
  | "PRICING"
  | "INFRASTRUCTURE"
  | "M_AND_A"
  | "GEOGRAPHIC_EXPANSION"
  | "RESTRUCTURING";
export type DecisionAction =
  | "HIRE"
  | "REWRITE"
  | "LAUNCH"
  | "DISCOUNT"
  | "EXPAND"
  | "ACQUIRE"
  | "DIVEST"
  | "INFRA_SPEND"
  | "REGIONAL_EXPANSION"
  | "RESTRUCTURE";
export type DecisionVerdict = "SAFE" | "RISKY" | "DANGEROUS";

export interface DecisionInput {
  lifecycle: LifecycleStage;
  category: DecisionCategory;
  action: DecisionAction;
  context?: string;
}

export interface DecisionOutput {
  verdict: DecisionVerdict;
  summary: string;
  bullets: string[];
  guardrail: string;
  reversalTrigger: string;
}

export const formatDecisionAction = (action: DecisionAction) =>
  DECISION_ACTION_LABELS[action];

const buildSensorBullets = (assessment: RegimeAssessment): string[] => {
  const bullets: string[] = [];
  const { baseRate, curveSlope, tightness, riskAppetite } = assessment.scores;
  const { baseRateTightness } = assessment.thresholds;
  const rateDirection = baseRate > baseRateTightness ? "above" : "below";
  const rateImpact = baseRate > baseRateTightness ? "capital is expensive" : "capital is moderate";

  bullets.push(
    `Base rate: ${baseRate.toFixed(2)}% is ${rateDirection} ${baseRateTightness}%, so ${rateImpact}.`
  );

  if (curveSlope === null) {
    bullets.push("Curve slope: unavailable, so inversion risk is unconfirmed.");
  } else if (curveSlope < 0) {
    bullets.push(`Curve slope: inverted (${curveSlope.toFixed(2)}%), signaling caution.`);
  } else {
    bullets.push(`Curve slope: positive (${curveSlope.toFixed(2)}%), supporting risk taking.`);
  }

  bullets.push(
    `Tightness ${tightness} vs risk appetite ${riskAppetite} keeps conditions in ${assessment.regime.toLowerCase()}.`
  );

  return bullets;
};

const buildReversalTrigger = (assessment: RegimeAssessment) => {
  return `Revisit when tightness drops below ${assessment.thresholds.tightnessRegime} and risk appetite rises above ${assessment.thresholds.riskAppetiteRegime} for ${REGIME_REVERSAL_DAYS} consecutive days (current: ${assessment.scores.tightness}/${assessment.scores.riskAppetite}).`;
};

export const evaluateDecision = (
  assessment: RegimeAssessment,
  input: DecisionInput
): DecisionOutput => {
  const verdict = DECISION_VERDICT_MATRIX[input.action][assessment.regime];
  const actionLabel = formatDecisionAction(input.action);
  const bullets = buildSensorBullets(assessment);

  return {
    verdict,
    summary: `Verdict: ${actionLabel} is ${verdict.toLowerCase()} for a ${input.lifecycle.toLowerCase()} team in ${assessment.regime.toLowerCase()} conditions.`,
    bullets,
    guardrail: DECISION_GUARDRAILS[input.action],
    reversalTrigger: buildReversalTrigger(assessment),
  };
};
