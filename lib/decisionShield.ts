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

const VERDICT_ORDER: DecisionVerdict[] = ["SAFE", "RISKY", "DANGEROUS"];

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


const adjustVerdict = (verdict: DecisionVerdict, direction: "up" | "down"): DecisionVerdict => {
  const index = VERDICT_ORDER.indexOf(verdict);
  if (direction === "up") {
    return VERDICT_ORDER[Math.min(index + 1, VERDICT_ORDER.length - 1)];
  }
  return VERDICT_ORDER[Math.max(index - 1, 0)];
};

const applyContextualVerdict = (baseVerdict: DecisionVerdict, input: DecisionInput): DecisionVerdict => {
  const capitalIntensiveActions: DecisionAction[] = [
    "HIRE",
    "REWRITE",
    "INFRA_SPEND",
    "EXPAND",
    "ACQUIRE",
    "REGIONAL_EXPANSION",
  ];

  if (input.lifecycle === "DISCOVERY" && capitalIntensiveActions.includes(input.action)) {
    return adjustVerdict(baseVerdict, "up");
  }

  if (
    input.lifecycle === "MATURE" &&
    input.category === "RESTRUCTURING" &&
    (input.action === "DIVEST" || input.action === "RESTRUCTURE")
  ) {
    return adjustVerdict(baseVerdict, "down");
  }

  return baseVerdict;
};

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
  const { tightnessRegime, riskAppetiteRegime } = assessment.thresholds;

  if (assessment.regime === "SCARCITY") {
    return `Revisit when tightness drops below ${tightnessRegime} and risk appetite rises above ${riskAppetiteRegime} for ${REGIME_REVERSAL_DAYS} consecutive days (current: ${assessment.scores.tightness}/${assessment.scores.riskAppetite}).`;
  }

  if (assessment.regime === "DEFENSIVE") {
    return `Revisit when tightness drops below ${tightnessRegime} or risk appetite falls to or below ${riskAppetiteRegime} for ${REGIME_REVERSAL_DAYS} consecutive days (current: ${assessment.scores.tightness}/${assessment.scores.riskAppetite}).`;
  }

  if (assessment.regime === "VOLATILE") {
    return `Revisit when tightness rises above ${tightnessRegime} or risk appetite rises above ${riskAppetiteRegime} for ${REGIME_REVERSAL_DAYS} consecutive days (current: ${assessment.scores.tightness}/${assessment.scores.riskAppetite}).`;
  }

  return `Revisit when tightness rises above ${tightnessRegime} or risk appetite falls to or below ${riskAppetiteRegime} for ${REGIME_REVERSAL_DAYS} consecutive days (current: ${assessment.scores.tightness}/${assessment.scores.riskAppetite}).`;
};

export const evaluateDecision = (
  assessment: RegimeAssessment,
  input: DecisionInput
): DecisionOutput => {
  const baseVerdict = DECISION_VERDICT_MATRIX[input.action][assessment.regime];
  const verdict = applyContextualVerdict(baseVerdict, input);
  const actionLabel = formatDecisionAction(input.action);
  const bullets = buildSensorBullets(assessment);

  return {
    verdict,
    summary: `Recommendation: ${actionLabel} is ${verdict.toLowerCase()} for a ${input.lifecycle.toLowerCase()} team in ${assessment.regime.toLowerCase()} conditions; confirm with human review.`,
    bullets,
    guardrail: DECISION_GUARDRAILS[input.action],
    reversalTrigger: buildReversalTrigger(assessment),
  };
};
