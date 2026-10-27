import type { RegimeKey } from "./regimeEngine";
import { REGIME_LABELS, REGIME_ORDER } from "./regimePresentation";

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

/**
 * The regime a label names, archived operator label or weather word alike, so
 * a surface that stores only the label can draw the condition's glyph beside
 * it. Undefined for a label neither vocabulary has.
 */
export const regimeKeyFromLabel = (label: string): RegimeKey | undefined => {
  const legacy = LEGACY_OPERATOR_LABELS[label];
  if (legacy) return legacy;
  return REGIME_ORDER.find((regime) => REGIME_LABELS[regime] === label);
};
