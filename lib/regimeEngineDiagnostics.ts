import type { MacroSeriesReading } from "./types";
import {
  RISK_APPETITE_REGIME_THRESHOLD,
  clamp,
  type RegimeAssessment,
  type RegimeDiagnostics,
  type RegimeSignalInfluence,
  type RegimeThresholds,
  type RegimeTrend,
} from "./regimeEngineCore";

const SCORE_MIN = 0;
const SCORE_MAX = 100;

/**
 * Macro stress adjustments.
 *
 * These sit on top of the rate-driven scores in `regimeEngineCore`: each pairs a
 * threshold (the level at which a series starts counting as stress), a
 * multiplier (how fast it accrues past that level), and a cap (the most it can
 * move the score). Only one of the thresholds below is a convention rather than
 * a product choice — see each note. The caps are all deliberately small: these
 * are corroborating reads, and no single one should be able to flip a regime on
 * its own.
 */

/** High-yield spread, in percentage points over Treasuries. 4.5% is near the
 *  long-run median; below it, risk lending is not the constraint. */
const HY_SPREAD_STRESS_THRESHOLD = 4.5;
const HY_SPREAD_TIGHTNESS_MULTIPLIER = 6;
const HY_SPREAD_TIGHTNESS_CAP = 15;
/** Convention, not a product choice: the Chicago Fed's index is constructed so
 *  that zero is average financial conditions and positive is tighter than
 *  average. Do not "tune" this one — it would stop meaning anything. */
const CHICAGO_FCI_TIGHTENING_THRESHOLD = 0;
const CHICAGO_FCI_TIGHTNESS_MULTIPLIER = 10;
const CHICAGO_FCI_TIGHTNESS_CAP = 10;
/** VIX level above which expected turbulence starts subtracting from risk
 *  appetite. 20 is the rough dividing line between calm and unsettled markets. */
const VIX_SHOCK_THRESHOLD = 20;
const VIX_RISK_APPETITE_MULTIPLIER = 1.5;
const VIX_RISK_APPETITE_CAP = 20;
/**
 * Market-stress veto bands, on the trailing 10-observation VIX mean.
 *
 * The haircut above can only subtract 20 points, which is not enough for the
 * weeks where the haircut and the financing read disagree the hardest: Mar-Apr
 * 2020, emergency cuts had steepened the curve (risk-appetite proxy ~59) while
 * VIX averaged 50-80. The haircut took ~20; the score still published
 * "risk appetite is healthy" mid-crash. The veto is a bounded cap with its own
 * reversal, so the call can never be EXPANSION while realized market stress is
 * extreme: mean 30+ caps the proxy at the regime line (posture cannot read
 * better than VOLATILE), mean 22-30 caps it 5 points above (late-unwind), and
 * below 22 the cap lifts entirely. Trailing mean over the reading's own history,
 * not the spot, so a one-day spike does not veto a week.
 */
const VIX_MARKET_STRESS_VETO_MEAN = 30;
const VIX_MARKET_STRESS_UNWIND_MEAN = 22;
const VIX_VETO_SOFT_CAP = 55;
const VIX_VETO_MEAN_WINDOW = 10;
/** Quarter-over-quarter percent change in venture funding flow. Anything worse
 *  than -5% counts as a slowdown. Capped lower than the VIX haircut, so a soft
 *  funding quarter cannot outweigh live market turbulence. */
const VC_VELOCITY_SLOWDOWN_THRESHOLD = -5;
const VC_VELOCITY_RISK_APPETITE_MULTIPLIER = 1.5;
const VC_VELOCITY_RISK_APPETITE_CAP = 10;
/** Level of the composite tech-layoff index above which layoffs count as
 *  pressure. Index units from the composite layoff snapshot, not a percentage. */
const LAYOFF_PRESSURE_THRESHOLD = 65;
const LAYOFF_RISK_APPETITE_MULTIPLIER = 0.6;
const LAYOFF_RISK_APPETITE_CAP = 12;

/**
 * Diagnostic bands, all measured in score points of distance from the nearest
 * regime threshold. They govern how loudly the product speaks, never what the
 * regime is: confidence wording, the transition-watch flag, and intensity.
 */
const DIAGNOSTIC_CONFIDENCE_HIGH_DELTA = 13;
const DIAGNOSTIC_CONFIDENCE_MEDIUM_DELTA = 6;
const DIAGNOSTIC_TRANSITION_WATCH_DELTA = 5;
const DIAGNOSTIC_INTENSITY_STRONG_DELTA = 25;
const DIAGNOSTIC_INTENSITY_STANDARD_DELTA = 10;
/** Two degraded signal reads in a row is the point at which the product warns
 *  rather than silently serving a thinner model. */
const TWO_WEAK_READS_WARNING_COUNT = 2;

/**
 * Read-only view of the stress-adjustment constants for the public formula
 * reference (/trust#formula-reference), so the page renders the values the
 * engine actually uses instead of retyped copies.
 */
export const MACRO_ADJUSTMENT_CONSTANTS = {
  hySpreadStressThreshold: HY_SPREAD_STRESS_THRESHOLD,
  hySpreadTightnessCap: HY_SPREAD_TIGHTNESS_CAP,
  chicagoFciTighteningThreshold: CHICAGO_FCI_TIGHTENING_THRESHOLD,
  chicagoFciTightnessCap: CHICAGO_FCI_TIGHTNESS_CAP,
  vixShockThreshold: VIX_SHOCK_THRESHOLD,
  vixRiskAppetiteCap: VIX_RISK_APPETITE_CAP,
  vixMarketStressVetoMean: VIX_MARKET_STRESS_VETO_MEAN,
  vixMarketStressUnwindMean: VIX_MARKET_STRESS_UNWIND_MEAN,
  vixVetoSoftCap: VIX_VETO_SOFT_CAP,
  vixVetoMeanWindow: VIX_VETO_MEAN_WINDOW,
  vcVelocitySlowdownThreshold: VC_VELOCITY_SLOWDOWN_THRESHOLD,
  vcVelocityRiskAppetiteCap: VC_VELOCITY_RISK_APPETITE_CAP,
  layoffPressureThreshold: LAYOFF_PRESSURE_THRESHOLD,
  layoffRiskAppetiteCap: LAYOFF_RISK_APPETITE_CAP,
} as const;

const getMacroValue = (series: MacroSeriesReading[], id: MacroSeriesReading["id"]) =>
  series.find((entry) => entry.id === id)?.value ?? null;

/** Trailing-mean helper for a reading that carries its own history. Falls back
 *  to the spot value when history is absent or too thin, so the veto degrades to
 *  a spot check rather than silently switching off. */
const trailingMean = (reading: MacroSeriesReading | undefined, window: number): number | null => {
  const spot = typeof reading?.value === "number" ? reading.value : null;
  const values = (reading?.history ?? [])
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number")
    .slice(-window);
  if (values.length >= window) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  return spot;
};

export const applyMacroAdjustments = (
  tightness: number,
  riskAppetite: number,
  macroSeries: MacroSeriesReading[],
) => {
  let adjustedTightness = tightness;
  let adjustedRiskAppetite = riskAppetite;
  const contributors: string[] = [];
  let weakReadCount = 0;
  let vetoApplied = false;

  const hySpread = getMacroValue(macroSeries, "HY_CREDIT_SPREAD");
  if (typeof hySpread === "number" && hySpread >= HY_SPREAD_STRESS_THRESHOLD) {
    adjustedTightness = clamp(
      adjustedTightness +
        Math.min(
          HY_SPREAD_TIGHTNESS_CAP,
          Math.round((hySpread - HY_SPREAD_STRESS_THRESHOLD) * HY_SPREAD_TIGHTNESS_MULTIPLIER),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("High-yield bond market stress");
    weakReadCount += 1;
  }

  const chicagoFci = getMacroValue(macroSeries, "CHICAGO_FCI");
  if (typeof chicagoFci === "number" && chicagoFci >= CHICAGO_FCI_TIGHTENING_THRESHOLD) {
    adjustedTightness = clamp(
      adjustedTightness +
        Math.min(
          CHICAGO_FCI_TIGHTNESS_CAP,
          Math.round(chicagoFci * CHICAGO_FCI_TIGHTNESS_MULTIPLIER),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("Financial conditions are tightening");
    weakReadCount += 1;
  }

  const vix = getMacroValue(macroSeries, "VIX_INDEX");
  if (typeof vix === "number" && vix >= VIX_SHOCK_THRESHOLD) {
    adjustedRiskAppetite = clamp(
      adjustedRiskAppetite -
        Math.min(
          VIX_RISK_APPETITE_CAP,
          Math.round((vix - VIX_SHOCK_THRESHOLD) * VIX_RISK_APPETITE_MULTIPLIER),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("Stock market volatility is high");
    weakReadCount += 1;
  }

  const vixReading = macroSeries.find((entry) => entry.id === "VIX_INDEX");
  const vixMean = trailingMean(vixReading, VIX_VETO_MEAN_WINDOW);
  if (vixMean !== null && vixMean >= VIX_MARKET_STRESS_UNWIND_MEAN) {
    const vetoCap = vixMean >= VIX_MARKET_STRESS_VETO_MEAN
      ? RISK_APPETITE_REGIME_THRESHOLD
      : VIX_VETO_SOFT_CAP;
    if (adjustedRiskAppetite > vetoCap) {
      adjustedRiskAppetite = vetoCap;
      contributors.push(
        vixMean >= VIX_MARKET_STRESS_VETO_MEAN
          ? "Market stress veto — posture cannot read better than transitional"
          : "Market stress unwinding — expansion tempo capped",
      );
      vetoApplied = true;
    }
  }

  const vcVelocity = getMacroValue(macroSeries, "VC_FUNDING_VELOCITY");
  if (typeof vcVelocity === "number" && vcVelocity <= VC_VELOCITY_SLOWDOWN_THRESHOLD) {
    adjustedRiskAppetite = clamp(
      adjustedRiskAppetite -
        Math.min(
          VC_VELOCITY_RISK_APPETITE_CAP,
          Math.round(
            Math.abs(vcVelocity - VC_VELOCITY_SLOWDOWN_THRESHOLD) *
              VC_VELOCITY_RISK_APPETITE_MULTIPLIER,
          ),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("VC funding slowdown");
    weakReadCount += 1;
  }

  const layoffs = getMacroValue(macroSeries, "TECH_LAYOFF_TREND");
  if (typeof layoffs === "number" && layoffs >= LAYOFF_PRESSURE_THRESHOLD) {
    adjustedRiskAppetite = clamp(
      adjustedRiskAppetite -
        Math.min(
          LAYOFF_RISK_APPETITE_CAP,
          Math.round((layoffs - LAYOFF_PRESSURE_THRESHOLD) * LAYOFF_RISK_APPETITE_MULTIPLIER),
        ),
      SCORE_MIN,
      SCORE_MAX,
    );
    contributors.push("Tech layoff pressure");
    weakReadCount += 1;
  }

  return {
    tightness: adjustedTightness,
    riskAppetite: adjustedRiskAppetite,
    boundaryContributors: contributors,
    weakReadCount,
    marketStressVetoApplied: vetoApplied,
  };
};

export const computeDiagnostics = (
  tightness: number,
  riskAppetite: number,
  thresholds: RegimeThresholds,
  boundaryContributors: string[] = [],
  weakReadCount = 0,
  /*
   * Set when either score came from a stand-in rather than a reading. Both
   * stand-ins sit far from the regime boundaries, and distance from a boundary is
   * what the confidence label below reads — so without this, a payload with no
   * data at all reported HIGH.
   */
  hasImputedInputs = false,
): RegimeDiagnostics => {
  const tightnessVsThreshold = Math.round(tightness - thresholds.tightnessRegime);
  const riskAppetiteVsThreshold = Math.round(riskAppetite - thresholds.riskAppetiteRegime);
  const nearestThresholdDelta = Math.min(Math.abs(tightnessVsThreshold), Math.abs(riskAppetiteVsThreshold));
  const confidence: RegimeDiagnostics["confidence"] = hasImputedInputs
    ? "LOW"
    : nearestThresholdDelta >= DIAGNOSTIC_CONFIDENCE_HIGH_DELTA
      ? "HIGH"
      : nearestThresholdDelta >= DIAGNOSTIC_CONFIDENCE_MEDIUM_DELTA
        ? "MEDIUM"
        : "LOW";
  const transitionWatch = nearestThresholdDelta <= DIAGNOSTIC_TRANSITION_WATCH_DELTA;
  const intensity =
    nearestThresholdDelta >= DIAGNOSTIC_INTENSITY_STRONG_DELTA
      ? "STRONG"
      : nearestThresholdDelta >= DIAGNOSTIC_INTENSITY_STANDARD_DELTA
        ? "STANDARD"
        : "MILD";

  return {
    tightnessVsThreshold,
    riskAppetiteVsThreshold,
    nearestThresholdDelta,
    confidence,
    transitionWatch,
    intensity,
    boundaryContributors,
    weakReadCount,
    twoWeakReadsWarning: weakReadCount >= TWO_WEAK_READS_WARNING_COUNT,
  };
};

export const buildSignalInfluence = ({
  tightness,
  riskAppetite,
  baseRate,
  curveSlope,
  thresholds,
}: {
  tightness: number;
  riskAppetite: number;
  baseRate: number | null;
  curveSlope: number | null;
  thresholds: RegimeThresholds;
}): RegimeSignalInfluence[] => [
  {
    key: "tightness",
    label: "Funding pressure",
    influence: Math.abs(tightness - thresholds.tightnessRegime),
    unavailable: false,
  },
  {
    key: "riskAppetite",
    label: "Risk appetite",
    influence: Math.abs(riskAppetite - thresholds.riskAppetiteRegime),
    unavailable: false,
  },
  {
    key: "baseRate",
    /**
     * Names the series actually read, matching `BASE_RATE_SOURCE_LABELS` in the
     * engine core. This used to say "Fed interest rate" while the reading fell
     * through to the one-month bill on every render.
     */
    label: "Short rate (1M bill)",
    influence:
      typeof baseRate === "number" ? Math.abs(baseRate - thresholds.baseRateTightness) : null,
    unavailable: typeof baseRate !== "number",
  },
  {
    key: "curveSlope",
    label: "Recession warning gauge",
    influence: typeof curveSlope === "number" ? Math.abs(curveSlope) : null,
    unavailable: typeof curveSlope !== "number",
  },
];

export const deriveRegimeTrend = (
  previous: RegimeAssessment | null,
  current: RegimeAssessment,
): RegimeTrend => {
  if (!previous) {
    return "STABLE";
  }

  const tightnessMovedUp =
    previous.scores.tightness <= previous.thresholds.tightnessRegime &&
    current.scores.tightness > current.thresholds.tightnessRegime;
  const tightnessMovedDown =
    previous.scores.tightness > previous.thresholds.tightnessRegime &&
    current.scores.tightness <= current.thresholds.tightnessRegime;
  const riskMovedUp =
    previous.scores.riskAppetite <= previous.thresholds.riskAppetiteRegime &&
    current.scores.riskAppetite > current.thresholds.riskAppetiteRegime;
  const riskMovedDown =
    previous.scores.riskAppetite > previous.thresholds.riskAppetiteRegime &&
    current.scores.riskAppetite <= current.thresholds.riskAppetiteRegime;

  const improvingSignals = Number(tightnessMovedDown) + Number(riskMovedUp);
  const deterioratingSignals = Number(tightnessMovedUp) + Number(riskMovedDown);

  if (improvingSignals > 0 && deterioratingSignals > 0) {
    return "MIXED";
  }
  if (improvingSignals > 0) {
    return "IMPROVING";
  }
  if (deterioratingSignals > 0) {
    return "DETERIORATING";
  }
  return "STABLE";
};

