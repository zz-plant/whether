import type { RegimeKey } from "./regimeEngine";
import { REGIME_LABELS } from "./regimePresentation";

/** Labels written into archives before the weather vocabulary was the only one. */
const LEGACY_OPERATOR_LABELS: Record<string, RegimeKey> = {
  Defend: "SCARCITY",
  Conserve: "DEFENSIVE",
  "Guarded Expand": "VOLATILE",
  Expand: "EXPANSION",
};

/** Renders an archived operator label in the current vocabulary; unknown labels pass through. */
export const toWeatherLabel = (label: string) => {
  const regime = LEGACY_OPERATOR_LABELS[label];
  return regime ? REGIME_LABELS[regime] : label;
};
