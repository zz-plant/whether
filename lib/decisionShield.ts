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
export type DecisionCategory = "HIRING" | "ROADMAP" | "PRICING" | "INFRASTRUCTURE";
export type DecisionAction = "HIRE" | "REWRITE" | "LAUNCH" | "DISCOUNT" | "EXPAND";
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
};

const GUARDRAILS: Record<DecisionAction, string> = {
  HIRE: "New headcount must repay within 90 days through direct revenue or cost savings.",
  REWRITE: "Only proceed if the rewrite unlocks 2x shipping velocity within two quarters.",
  LAUNCH: "Launch only if it meaningfully reduces churn or expands ARPA within one quarter.",
  DISCOUNT: "Discounts must trade for annual prepay or multi-year commitments.",
  EXPAND: "Expand only when support capacity and retention metrics stay above baseline.",
};

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
  const bullets = buildSensorBullets(assessment);

  return {
    verdict,
    summary: `${input.action} is ${verdict.toLowerCase()} in the current ${assessment.regime.toLowerCase()} regime for a ${input.lifecycle.toLowerCase()} team.`,
    bullets,
    guardrail: GUARDRAILS[input.action],
    reversalTrigger: buildReversalTrigger(assessment),
  };
};
