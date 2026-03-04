import type { RegimeKey } from "../regimeEngine";

const REGIME_STATUS_LABELS: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Volatile",
  EXPANSION: "Expansion",
};

export const getRegimeStatusLabel = (regime: RegimeKey) => REGIME_STATUS_LABELS[regime];

