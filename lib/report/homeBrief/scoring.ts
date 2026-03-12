import type { MacroSeriesReading } from "../../types";
import type { Regime } from "../homeBriefModel";

export type StartupClimateIndex = {
  score: number;
  status: "Improving" | "Stable" | "Deteriorating";
  breakdown: Array<{ label: string; score: number }>;
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const findMacroValue = (macroSeries: MacroSeriesReading[] | undefined, id: MacroSeriesReading["id"]): number | null =>
  macroSeries?.find((series) => series.id === id)?.value ?? null;

export const buildStartupClimateIndex = ({
  assessment,
  macroSeries,
  trendLabel,
}: {
  assessment: {
    regime: Regime;
    thresholds: { tightnessRegime: number; riskAppetiteRegime: number };
    scores: { tightness: number; riskAppetite: number };
  };
  macroSeries: MacroSeriesReading[] | undefined;
  trendLabel: "Improving" | "Deteriorating" | "Mixed" | "Stable";
}): StartupClimateIndex => {
  const capitalAvailability = clampScore((100 - assessment.scores.tightness) * 0.6 + assessment.scores.riskAppetite * 0.4);
  const unemployment = findMacroValue(macroSeries, "UNEMPLOYMENT_RATE");
  const hiringMarket = clampScore(unemployment === null ? 55 : 100 - unemployment * 10);
  const saasMultiple = findMacroValue(macroSeries, "SAAS_VALUATION_MULTIPLE");
  const valuations = clampScore(saasMultiple === null ? 55 : Math.min(100, saasMultiple * 8));
  const vix = findMacroValue(macroSeries, "VIX_INDEX");
  const ipoWindow = clampScore(vix === null ? 50 : 100 - vix * 2);

  const breakdown = [
    { label: "Capital availability", score: capitalAvailability },
    { label: "Hiring market", score: hiringMarket },
    { label: "SaaS valuations", score: valuations },
    { label: "IPO window", score: ipoWindow },
  ];

  const score = clampScore(breakdown.reduce((sum, item) => sum + item.score, 0) / breakdown.length);
  return {
    score,
    status: trendLabel === "Mixed" ? "Stable" : trendLabel,
    breakdown,
  };
};
