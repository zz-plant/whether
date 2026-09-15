import { formatDateUTC } from "../formatters";

type SignalContribution = {
  key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
  label: string;
  influence: number | null;
  unavailable?: boolean;
};

export type NormalizedSignalContribution = SignalContribution & {
  normalized: number;
  normalizedPercentLabel: string;
};

export const formatDelta = (thenValue: number, nowValue: number, unit = "") => {
  const delta = nowValue - thenValue;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}${unit}`;
};

export const normalizeSignalContributions = (
  contributions: SignalContribution[]
): NormalizedSignalContribution[] => {
  const totalInfluence = contributions.reduce(
    (sum, item) => sum + (typeof item.influence === "number" && item.influence > 0 ? item.influence : 0),
    0
  );

  const normalized = contributions.map((item) => {
    const value = typeof item.influence === "number" && item.influence > 0 ? item.influence : 0;
    const ratio = totalInfluence > 0 ? value / totalInfluence : 0;
    return {
      ...item,
      normalized: ratio,
      normalizedPercentLabel: `${Math.round(ratio * 100)}%`,
    };
  });

  return normalized.sort((a, b) => {
    if (a.unavailable !== b.unavailable) {
      return a.unavailable ? 1 : -1;
    }
    if (b.normalized !== a.normalized) {
      return b.normalized - a.normalized;
    }
    return a.label.localeCompare(b.label);
  });
};

export const formatDateLabel = (value: string) => formatDateUTC(value);
