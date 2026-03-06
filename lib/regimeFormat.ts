import type { RegimeKey } from "./regimeEngine";

export const formatRegimeLabel = (regime: RegimeKey): string => {
  switch (regime) {
    case "SCARCITY":
      return "Scarcity";
    case "DEFENSIVE":
      return "Defensive";
    case "VOLATILE":
      return "Volatile";
    case "EXPANSION":
      return "Expansion";
    default:
      return regime;
  }
};
