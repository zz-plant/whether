/**
 * Decision Shield logic for translating capital postures into operator-safe verdicts.
 * Produces shareable, plain-English guidance tied to sensor conditions.
 */
import type { RegimeAssessment } from "./regimeEngine";
import { REGIME_REVERSAL_DAYS } from "./regimeEngine";
import { REGIME_LABELS } from "./regimePresentation";
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

const VERDICT_COPY: Record<DecisionVerdict, string> = {
  SAFE: "a safe call",
  RISKY: "a risky call",
  DANGEROUS: "a dangerous call",
};

const LIFECYCLE_COPY: Record<LifecycleStage, string> = {
  DISCOVERY: "discovery-stage",
  GROWTH: "growth-stage",
  SCALE: "scaling",
  MATURE: "mature",
};

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

  bullets.push(
    baseRate > baseRateTightness
      ? `The Fed rate is ${baseRate.toFixed(2)}%, above the ${baseRateTightness}% line where capital gets expensive.`
      : `The Fed rate is ${baseRate.toFixed(2)}%, below the ${baseRateTightness}% line, so the cost of capital is manageable.`
  );

  if (curveSlope === null) {
    bullets.push("The recession warning gauge is unavailable this week, so inversion risk is unconfirmed.");
  } else if (curveSlope < 0) {
    bullets.push(`The yield curve is inverted at ${curveSlope.toFixed(2)}%, which historically argues for caution.`);
  } else {
    bullets.push(`The yield curve is positive at ${curveSlope.toFixed(2)}%, which leaves room for risk-taking.`);
  }

  bullets.push(
    `Funding pressure at ${tightness} against risk appetite at ${riskAppetite} holds conditions in ${REGIME_LABELS[assessment.regime]}.`
  );

  return bullets;
};

const buildReversalTrigger = (assessment: RegimeAssessment) => {
  const { tightnessRegime, riskAppetiteRegime } = assessment.thresholds;
  const cash = `funding pressure (now ${assessment.scores.tightness})`;
  const risk = `risk appetite (now ${assessment.scores.riskAppetite})`;
  const hold = `for ${REGIME_REVERSAL_DAYS} straight days`;

  if (assessment.regime === "SCARCITY") {
    return `Revisit once ${cash} drops below ${tightnessRegime} and ${risk} rises above ${riskAppetiteRegime} ${hold}.`;
  }

  if (assessment.regime === "DEFENSIVE") {
    return `Revisit once ${cash} drops below ${tightnessRegime}, or ${risk} falls to or below ${riskAppetiteRegime} ${hold}.`;
  }

  if (assessment.regime === "VOLATILE") {
    return `Revisit once ${cash} rises above ${tightnessRegime}, or ${risk} rises above ${riskAppetiteRegime} ${hold}.`;
  }

  return `Revisit once ${cash} rises above ${tightnessRegime}, or ${risk} falls to or below ${riskAppetiteRegime} ${hold}.`;
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
    summary: `On this week's signals, ${actionLabel.toLowerCase()} is ${VERDICT_COPY[verdict]} for a ${LIFECYCLE_COPY[input.lifecycle]} team in ${REGIME_LABELS[assessment.regime]} conditions.`,
    bullets,
    guardrail: DECISION_GUARDRAILS[input.action],
    reversalTrigger: buildReversalTrigger(assessment),
  };
};
