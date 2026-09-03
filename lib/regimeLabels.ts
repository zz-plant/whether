import type { RegimeKey } from "./regimeEngine";
import { REGIME_WEATHER_LABELS } from "./regimePresentation";

// One vocabulary. Summaries, cadence cards, and the posture archive used to name
// the regime "Expand" / "Guarded Expand" / "Conserve" / "Defend" while the brief
// said Sunny / Stormy / Cloudy / Freezing — four words for one state, on pages
// that link to each other. The operator label is now the weather label.
export const getRegimeOperatorLabel = (regime: RegimeKey) => REGIME_WEATHER_LABELS[regime];

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
  return regime ? REGIME_WEATHER_LABELS[regime] : label;
};
