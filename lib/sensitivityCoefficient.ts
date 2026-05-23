/**
 * Sensitivity coefficient — estimates how much a company's operating posture
 * should respond to macro tightening, based on stage, financial position, and
 * current regime. Heuristic model, not regression — no historical company data.
 */

export type SensitivityProfile = {
  /** 1-10 scale; 1 = insensitive (public, profitable), 10 = extremely sensitive (seed, burning) */
  score: number;
  /** Primary vulnerability factor */
  primaryRisk: "runway" | "burn_rate" | "growth_dependency" | "capital_markets" | "none";
  /** One-sentence explanation */
  explanation: string;
  /** Recommended operating adjustment for current tightness */
  adjustment: string;
};

export function computeSensitivity(params: {
  /** Company stage from localStorage metrics */
  stage?: string;
  /** Revenue growth rate (e.g., 0.22 = 22%) */
  revenueGrowth?: number;
  /** Free cash flow margin (e.g., -0.15 = burning 15%) */
  fcfMargin?: number;
  /** Months of runway remaining */
  runwayMonths?: number;
  /** Monthly burn rate */
  burnRate?: number;
  /** Current tightness score (0-100) */
  tightness: number;
}): SensitivityProfile {
  const {
    stage = "seed",
    revenueGrowth = 0,
    fcfMargin = 0,
    runwayMonths = 18,
    burnRate,
    tightness,
  } = params;

  // Stage sensitivity multipliers
  const stageMultiplier: Record<string, number> = {
    seed: 2.0,
    "series-a": 1.7,
    "series-b": 1.4,
    "series-c": 1.1,
    growth: 0.7,
    public: 0.3,
  };
  const stageMult = stageMultiplier[stage.toLowerCase()] ?? 1.5;

  let runwayScore = 0;
  if (runwayMonths < 6) runwayScore = 4;
  else if (runwayMonths < 12) runwayScore = 3;
  else if (runwayMonths < 18) runwayScore = 2;
  else if (runwayMonths < 24) runwayScore = 1;

  let burnScore = 0;
  if (fcfMargin < -0.3) burnScore = 3;
  else if (fcfMargin < -0.15) burnScore = 2;
  else if (fcfMargin < -0.05) burnScore = 1;
  else if (fcfMargin < 0) burnScore = 0.5;

  const growthMult = Math.min(2, Math.max(0.5, 1 + revenueGrowth * 3));
  const tightnessMult = tightness > 80 ? 1.4 : tightness > 60 ? 1.2 : tightness > 40 ? 1.0 : 0.8;
  const raw = (runwayScore + burnScore + (stageMult - 0.5)) * growthMult * tightnessMult;
  const score = Math.min(10, Math.max(1, Math.round(raw)));

  let primaryRisk: SensitivityProfile["primaryRisk"] = "none";
  if (runwayMonths < 12 && burnRate && burnRate > 0)
    primaryRisk = "runway";
  else if (fcfMargin < -0.10)
    primaryRisk = "burn_rate";
  else if (revenueGrowth > 0.30 && fcfMargin < 0)
    primaryRisk = "growth_dependency";
  else if (stage === "seed" || stage === "series-a")
    primaryRisk = "capital_markets";

  const explanations: Record<SensitivityProfile["primaryRisk"], string> = {
    runway: `${runwayMonths} months runway with ${burnRate ? `$${(burnRate / 1000).toFixed(0)}k/mo burn` : "active burn"} — rate-sensitive. Tightening typically extends fundraising timelines 2-3 months.`,
    burn_rate: `Operating at ${(fcfMargin * 100).toFixed(0)}% FCF margin — cash consumption increases risk during tightening cycles.`,
    growth_dependency: `${(revenueGrowth * 100).toFixed(0)}% growth with negative FCF — capital-dependent. Market access matters more than operating efficiency in tight regimes.`,
    capital_markets: `Pre-revenue or early stage — external capital access is primary risk during tightening.`,
    none: "Stable financial position. Tightening has muted direct impact.",
  };

  const adjustments: string[] = [];
  if (score >= 7) {
    adjustments.push("extend runway to 18+ months immediately");
    adjustments.push("freeze non-essential hiring");
    adjustments.push("cut burn by 20-30%");
  } else if (score >= 5) {
    adjustments.push("reduce non-core spend");
    adjustments.push("extend runway to 12+ months");
    adjustments.push("defer expansion hires");
  } else if (score >= 3) {
    adjustments.push("monitor burn monthly");
    adjustments.push("maintain current runway");
  } else {
    adjustments.push("continue as planned");
    adjustments.push("tightening has limited direct impact");
  }

  return {
    score,
    primaryRisk,
    explanation: explanations[primaryRisk],
    adjustment: adjustments.join("; "),
  };
}
