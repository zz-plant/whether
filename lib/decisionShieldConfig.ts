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
    DEFENSIVE: "SAFE",
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
    EXPANSION: "SAFE",
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
    DEFENSIVE: "SAFE",
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
    DEFENSIVE: "SAFE",
    VOLATILE: "RISKY",
    EXPANSION: "RISKY",
  },
};

export const DECISION_GUARDRAILS: Record<DecisionAction, string> = {
  HIRE: "Phase hiring in 30-day tranches; each cohort must show payback traction within 120 days via booked revenue or verified cost reduction.",
  REWRITE: "Ship rewrite milestones every 45 days and continue only while release throughput trends at least 1.5x above baseline.",
  LAUNCH: "Launch behind staged rollouts (10%→50%→100%) and continue only while churn and ARPA stay at or above pre-launch trend over the first 60 days.",
  DISCOUNT: "Use discount windows capped at 30 days and pair each concession with annual prepay, multi-year term, or measurable expansion rights.",
  EXPAND: "Expand in waves and hold each wave unless support SLA, retention, and margin stay within 5% of baseline for two consecutive monthly reads.",
  ACQUIRE: "Advance only with an integration plan that shows leading KPI lift inside 90 days and clear payback path inside 12 months at current burn.",
  DIVEST: "Execute with signed transition owners and service continuity checkpoints every 30 days until revenue retention stabilizes.",
  INFRA_SPEND: "Release infrastructure spend in milestones and continue only when unit-cost or SLA gains are visible within the first 90 days.",
  REGIONAL_EXPANSION: "Open regions in pilot mode first; scale only after two consecutive monthly cohorts hit demand, activation, and support readiness thresholds.",
  RESTRUCTURE: "Proceed in sequenced phases and continue only while runway extends by at least one quarter without breaching delivery commitments.",
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
