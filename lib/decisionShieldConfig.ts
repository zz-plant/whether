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
    VOLATILE: "SAFE",
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
    VOLATILE: "SAFE",
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
    DEFENSIVE: "SAFE",
    VOLATILE: "RISKY",
    EXPANSION: "RISKY",
  },
};

export const DECISION_GUARDRAILS: Record<DecisionAction, string> = {
  HIRE: "Hire in waves tied to funded demand; each wave should show payback within one quarter.",
  REWRITE: "Proceed only when scope is staged and each milestone protects delivery for the core roadmap.",
  LAUNCH: "Launch on schedule when success metrics are pre-registered and rollback paths are in place.",
  DISCOUNT: "Discounts must trade for annual prepay or multi-year commitments.",
  EXPAND: "Expand in phases only when support capacity and retention stay at or above baseline.",
  ACQUIRE: "Acquire only if the target accelerates core metrics within 12 months at current burn.",
  DIVEST: "Divest only with a transition plan that protects revenue continuity within two quarters.",
  INFRA_SPEND: "Approve infra spend in tranches when each tranche cuts unit costs or improves SLA reliability.",
  REGIONAL_EXPANSION: "Open new regions sequentially with localized demand proof and support readiness.",
  RESTRUCTURE: "Restructure when the plan measurably extends runway or protects margin within two quarters.",
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
