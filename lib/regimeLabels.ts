import type { RegimeKey } from "./regimeEngine";

const REGIME_OPERATOR_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Defend",
  DEFENSIVE: "Conserve",
  VOLATILE: "Guarded Expand",
  EXPANSION: "Expand",
};

export const getRegimeOperatorLabel = (regime: RegimeKey) => REGIME_OPERATOR_LABELS[regime];
