/**
 * Decision Shield configuration for verdicts, guardrails, and display labels.
 * Keeps data-driven policy separate from evaluation logic.
 */
import type { DecisionAction, DecisionVerdict } from "./decisionShield";
import type { RegimeKey } from "./regimeEngine";

export const DECISION_VERDICT_MATRIX: Record<
  DecisionAction,
  Record<RegimeKey, DecisionVerdict>
> = {
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

export const DECISION_GUARDRAILS: Record<DecisionAction, string> = {
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

export const DECISION_ACTION_LABELS: Record<DecisionAction, string> = {
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
