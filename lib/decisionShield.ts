/**
 * Decision Shield logic for translating market climates into operator-safe verdicts.
 * Produces shareable, plain-English guidance tied to sensor conditions.
 */
import type { RegimeAssessment, RegimeKey } from "./regimeEngine";
import { REGIME_REVERSAL_DAYS } from "./regimeEngine";

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

const VERDICT_MATRIX: Record<DecisionAction, Record<RegimeKey, DecisionVerdict>> = {
  HIRE: {
    SCARCITY: "DANGEROUS",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "SAFE",
  },
  REWRITE: {
    SCARCITY: "DANGEROUS",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "SAFE",
  },
  LAUNCH: {
    SCARCITY: "RISKY",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "SAFE",
  },
  DISCOUNT: {
    SCARCITY: "RISKY",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "RISKY",
  },
  EXPAND: {
    SCARCITY: "DANGEROUS",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "SAFE",
  },
  ACQUIRE: {
    SCARCITY: "DANGEROUS",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "SAFE",
  },
  DIVEST: {
    SCARCITY: "SAFE",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "RISKY",
  },
  INFRA_SPEND: {
    SCARCITY: "DANGEROUS",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "SAFE",
  },
  REGIONAL_EXPANSION: {
    SCARCITY: "DANGEROUS",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "SAFE",
  },
  RESTRUCTURE: {
    SCARCITY: "SAFE",
    DEFENSIVE: "RISKY",
    VOLATILE: "RISKY",
    EXPANSION: "RISKY",
  },
};

const GUARDRAILS: Record<DecisionAction, string> = {
  HIRE: "New headcount must repay within 90 days through direct revenue or cost savings.",
  REWRITE: "Only proceed if the rewrite unlocks 2x shipping velocity within two quarters.",
  LAUNCH: "Launch only if it meaningfully reduces churn or expands ARPA within one quarter.",
  DISCOUNT: "Discounts must trade for annual prepay or multi-year commitments.",
  EXPAND: "Expand only when support capacity and retention metrics stay above baseline.",
  ACQUIRE: "Acquire only if the target accelerates core metrics within 12 months at current burn.",
  DIVEST: "Divest only with a transition plan that protects revenue continuity within two quarters.",
  INFRA_SPEND: "Infrastructure spend must cut unit costs or unlock SLA gains within six months.",
  REGIONAL_EXPANSION: "Expand regions only with localized demand proof and support readiness.",
  RESTRUCTURE: "Restructure only when runway extends by at least two quarters post-change.",
};

const ACTION_LABELS: Record<DecisionAction, string> = {
  HIRE: "Hire",
  REWRITE: "Rewrite",
  LAUNCH: "Launch",
  DISCOUNT: "Discount",
  EXPAND: "Expand",
  ACQUIRE: "Acquire",
  DIVEST: "Divest",
  INFRA_SPEND: "Infra spend",
  REGIONAL_EXPANSION: "Regional expansion",
  RESTRUCTURE: "Restructure",
};

export const formatDecisionAction = (action: DecisionAction) => ACTION_LABELS[action];

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
  const verdict = VERDICT_MATRIX[input.action][assessment.regime];
  const actionLabel = formatDecisionAction(input.action);
  const bullets = buildSensorBullets(assessment);

  return {
    verdict,
    summary: `Verdict: ${actionLabel} is ${verdict.toLowerCase()} for a ${input.lifecycle.toLowerCase()} team in ${assessment.regime.toLowerCase()} conditions.`,
    bullets,
    guardrail: GUARDRAILS[input.action],
    reversalTrigger: buildReversalTrigger(assessment),
  };
};
