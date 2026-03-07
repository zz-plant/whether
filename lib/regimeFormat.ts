import type { RegimeKey } from "./regimeEngine";
import { REGIME_LABELS } from "./regimePresentation";

export const formatRegimeLabel = (regime: RegimeKey): string => {
  return REGIME_LABELS[regime] ?? regime;
};
