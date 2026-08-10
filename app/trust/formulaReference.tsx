import type { ReactNode } from "react";
import { ReportSection } from "../components/reportSection";
import {
  BASE_RATE_TIGHTNESS_MULTIPLIER,
  BASE_RATE_TIGHTNESS_THRESHOLD,
  CURVE_INVERSION_TIGHTNESS_MULTIPLIER,
  MACRO_ADJUSTMENT_CONSTANTS,
  REGIME_CONFIDENCE_MEDIUM_THRESHOLD,
  REGIME_CONFIDENCE_NEAR_THRESHOLD,
  RISK_APPETITE_MAX_SLOPE,
  RISK_APPETITE_MIN_SLOPE,
  RISK_APPETITE_REGIME_THRESHOLD,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_INVERSION_POINTS,
  TIGHTNESS_REGIME_THRESHOLD,
} from "../../lib/regimeEngine";

const ENGINE_SOURCE_URL = "https://github.com/zz-plant/whether/blob/main/lib/regimeEngineCore.ts";

/** Base rate at which the rate component of tightness saturates. */
const baseRateSaturation =
  BASE_RATE_TIGHTNESS_THRESHOLD + TIGHTNESS_BASE_RATE_POINTS / BASE_RATE_TIGHTNESS_MULTIPLIER;

/** Curve inversion depth at which the inversion component saturates. */
const inversionSaturation = TIGHTNESS_INVERSION_POINTS / CURVE_INVERSION_TIGHTNESS_MULTIPLIER;

const adj = MACRO_ADJUSTMENT_CONSTANTS;

function FormulaCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="weather-hub-card space-y-2 rounded-lg px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      {children}
    </article>
  );
}

/**
 * The published scoring methodology. Every number here is imported from the
 * scoring engine's own constants — if the engine changes, this page changes
 * with it. Kept outside the healthy-state <details> collapse on /trust so the
 * "Sources and formulas" links from /about and /threshold land on real content.
 */
export function FormulaReference() {
  return (
    <ReportSection
      id="formula-reference"
      title="How the score is built"
      description="The full derivation, from public data series to the weekly call."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <FormulaCard title="Inputs — all public">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400">Rates:</span> FRED daily series — DFF (fed funds; falls
              back to DGS1MO, then DGS3MO), DGS2, DGS10.
            </li>
            <li>
              <span className="text-slate-400">Stress reads:</span> high-yield credit spread, Chicago
              Fed financial conditions index, VIX, VC funding velocity, tech layoff trend.
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title="Tightness · 0–100 · cost of money">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <code className="text-sky-200">
                min({TIGHTNESS_BASE_RATE_POINTS}, (base rate − {BASE_RATE_TIGHTNESS_THRESHOLD}) ×{" "}
                {BASE_RATE_TIGHTNESS_MULTIPLIER})
              </code>{" "}
              — 0 points at {BASE_RATE_TIGHTNESS_THRESHOLD}%, all {TIGHTNESS_BASE_RATE_POINTS} at{" "}
              {baseRateSaturation}%.
            </li>
            <li>
              <code className="text-sky-200">
                + min({TIGHTNESS_INVERSION_POINTS}, inversion depth ×{" "}
                {CURVE_INVERSION_TIGHTNESS_MULTIPLIER})
              </code>{" "}
              when the 10Y−2Y curve is inverted; saturates at −{inversionSaturation}%.
            </li>
            <li>
              <span className="text-slate-400">Stress add-ons:</span> HY spread ≥{" "}
              {adj.hySpreadStressThreshold}% adds up to +{adj.hySpreadTightnessCap}; Chicago FCI ≥{" "}
              {adj.chicagoFciTighteningThreshold} adds up to +{adj.chicagoFciTightnessCap}.
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title="Risk appetite · 0–100 · willingness to fund risk">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              10Y−2Y slope mapped linearly: {RISK_APPETITE_MIN_SLOPE}% → 0,{" "}
              +{RISK_APPETITE_MAX_SLOPE}% → 100.
            </li>
            <li>
              <span className="text-slate-400">Haircuts:</span> VIX ≥ {adj.vixShockThreshold}{" "}
              subtracts up to {adj.vixRiskAppetiteCap}; VC funding velocity ≤{" "}
              {adj.vcVelocitySlowdownThreshold}% subtracts up to {adj.vcVelocityRiskAppetiteCap};
              layoff trend ≥ {adj.layoffPressureThreshold} subtracts up to {adj.layoffRiskAppetiteCap}.
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title="Regime, headline number, confidence">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400">Regime:</span> quadrant of tightness vs{" "}
              {TIGHTNESS_REGIME_THRESHOLD} and risk appetite vs {RISK_APPETITE_REGIME_THRESHOLD}.
              Near a threshold or at MEDIUM confidence, a change must repeat on two consecutive
              reads before it commits; LOW confidence blocks the switch.
            </li>
            <li>
              <span className="text-slate-400">Boldness (homepage headline):</span>{" "}
              <code className="text-sky-200">0.7 × risk appetite + 0.3 × (100 − tightness)</code>
            </li>
            <li>
              <span className="text-slate-400">Confidence:</span> distance to the nearest regime
              threshold — under {REGIME_CONFIDENCE_NEAR_THRESHOLD} points LOW, under{" "}
              {REGIME_CONFIDENCE_MEDIUM_THRESHOLD} MED, otherwise HIGH.
            </li>
          </ul>
        </FormulaCard>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        Every constant above is imported from the scoring engine, not retyped — if the engine
        changes, this page changes with it.{" "}
        <a
          href={ENGINE_SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[44px] items-center font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
        >
          Read the engine source →
        </a>
      </p>
    </ReportSection>
  );
}
