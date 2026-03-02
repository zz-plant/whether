import { type RegimeKey } from "./regimeEngine";
import monthlySummaries from "../data/monthly_summaries_2012_2025.json";
import type { ProductConceptArticle } from "./productCanon";

type MonthlySummaryEntry = {
  year: number;
  month: number;
  summary: {
    regime: RegimeKey;
    regimeLabel: string;
  };
};

const entries = monthlySummaries as MonthlySummaryEntry[];

const oppositeRegime: Record<RegimeKey, RegimeKey> = {
  SCARCITY: "EXPANSION",
  EXPANSION: "SCARCITY",
  DEFENSIVE: "VOLATILE",
  VOLATILE: "DEFENSIVE",
};

export const getCurrentRegimeContext = () => {
  const latest = entries.at(-1);

  if (!latest) {
    return null;
  }

  return {
    regime: latest.summary.regime,
    regimeLabel: latest.summary.regimeLabel,
    asOf: `${latest.year}-${String(latest.month).padStart(2, "0")}-01`,
  };
};

export const getConceptRegimeStatus = (
  article: ProductConceptArticle,
  currentRegime: RegimeKey | null,
): "aligned" | "mismatch" | "unknown" => {
  if (!currentRegime) {
    return "unknown";
  }

  const macroContext = entries.find(
    (entry) => entry.year === article.publishedYear && entry.month === article.publishedMonth,
  );

  if (!macroContext) {
    return "unknown";
  }

  if (macroContext.summary.regime === currentRegime) {
    return "aligned";
  }

  return oppositeRegime[macroContext.summary.regime] === currentRegime ? "mismatch" : "aligned";
};

export const getConceptPublicationRegime = (article: ProductConceptArticle) => {
  return entries.find(
    (entry) => entry.year === article.publishedYear && entry.month === article.publishedMonth,
  )?.summary;
};
