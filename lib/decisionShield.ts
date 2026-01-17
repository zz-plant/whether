/**
 * Decision Shield logic for translating regimes into operator-safe verdicts.
 * Produces shareable, plain-English guidance tied to sensor conditions.
 */
import type { RegimeAssessment, RegimeKey } from "./regimeEngine";
import {
  BASE_RATE_TIGHTNESS_THRESHOLD,
  REGIME_REVERSAL_DAYS,
  RISK_APPETITE_REGIME_THRESHOLD,
  TIGHTNESS_REGIME_THRESHOLD,
} from "./regimeEngine";

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

  if (baseRate > BASE_RATE_TIGHTNESS_THRESHOLD) {
    bullets.push(
      `Base rates are above ${BASE_RATE_TIGHTNESS_THRESHOLD}%, making capital meaningfully expensive.`
    );
  } else {
    bullets.push(`Base rates are below ${BASE_RATE_TIGHTNESS_THRESHOLD}%, keeping capital costs moderate.`);
  }

  if (curveSlope === null) {
    bullets.push("The yield curve slope is unavailable, so inversion risk is unconfirmed.");
  } else if (curveSlope < 0) {
    bullets.push("The yield curve is inverted, signaling cautious market behavior.");
  } else {
    bullets.push("The yield curve is positive, signaling healthier risk appetite.");
  }

  bullets.push(
    `Tightness score is ${tightness}, risk appetite score is ${riskAppetite}, placing you in ${assessment.regime.toLowerCase()} conditions.`
  );

  return bullets;
};

const buildReversalTrigger = (assessment: RegimeAssessment) => {
  return `Revisit when tightness drops below ${TIGHTNESS_REGIME_THRESHOLD} and risk appetite rises above ${RISK_APPETITE_REGIME_THRESHOLD} for ${REGIME_REVERSAL_DAYS} consecutive days (current: ${assessment.scores.tightness}/${assessment.scores.riskAppetite}).`;
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
    summary: `${actionLabel} is ${verdict.toLowerCase()} in the current ${assessment.regime.toLowerCase()} regime for a ${input.lifecycle.toLowerCase()} team.`,
    bullets,
    guardrail: GUARDRAILS[input.action],
    reversalTrigger: buildReversalTrigger(assessment),
  };
};
