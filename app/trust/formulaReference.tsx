import type { ReactNode } from "react";
import { ReportSection } from "../components/reportSection";
import { GlossaryLink } from "../components/ui/plainLanguage";
import { compositeSignalScales, signalPlainEnglish } from "../../lib/report/signalTranslations";
import {
  BASE_RATE_TIGHTNESS_MULTIPLIER,
  BASE_RATE_TIGHTNESS_THRESHOLD,
  BASE_RATE_VELOCITY_LOOKBACK_DAYS,
  BASE_RATE_VELOCITY_MULTIPLIER,
  BASE_RATE_VELOCITY_POINTS,
  BASE_RATE_VELOCITY_THRESHOLD,
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
import type { RegimeKey } from "../../lib/regimeEngine";
import { REGIME_LABELS } from "../../lib/regimePresentation";

const ENGINE_SOURCE_URL = "https://github.com/zz-plant/whether/blob/main/lib/regimeEngineCore.ts";

/** Base rate at which the rate component of tightness saturates. */
const baseRateSaturation =
  BASE_RATE_TIGHTNESS_THRESHOLD + TIGHTNESS_BASE_RATE_POINTS / BASE_RATE_TIGHTNESS_MULTIPLIER;

/** Curve inversion depth at which the inversion component saturates. */
const inversionSaturation = TIGHTNESS_INVERSION_POINTS / CURVE_INVERSION_TIGHTNESS_MULTIPLIER;

const adj = MACRO_ADJUSTMENT_CONSTANTS;

/**
 * The regime rule is a 2x2: which quadrant the two scores land in. Stated in
 * prose it was one sentence carrying two thresholds and four names; drawn, it
 * is the thing itself.
 */
function RegimeQuadrant() {
  const t = TIGHTNESS_REGIME_THRESHOLD;
  const r = RISK_APPETITE_REGIME_THRESHOLD;
  const W = 260;
  const H = 180;
  const pad = { l: 34, r: 8, t: 8, b: 30 };
  const x = (v: number) => pad.l + (v / 100) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / 100) * (H - pad.t - pad.b);
  const cells: Array<{ key: RegimeKey; x0: number; x1: number; y0: number; y1: number }> = [
    { key: "EXPANSION", x0: 0, x1: t, y0: r, y1: 100 },
    { key: "VOLATILE", x0: t, x1: 100, y0: r, y1: 100 },
    { key: "DEFENSIVE", x0: 0, x1: t, y0: 0, y1: r },
    { key: "SCARCITY", x0: t, x1: 100, y0: 0, y1: r },
  ];
  const fill: Record<RegimeKey, string> = {
    EXPANSION: "rgba(52,211,153,0.18)",
    VOLATILE: "rgba(251,191,36,0.18)",
    DEFENSIVE: "rgba(56,189,248,0.14)",
    SCARCITY: "rgba(248,113,113,0.18)",
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[20rem] text-slate-300" aria-labelledby="regime-quadrant-title">
      <title id="regime-quadrant-title">
        {`Regime quadrants: funding pressure above ${t} and risk appetite below ${r} pick the environment.`}
      </title>
      {cells.map((cell) => (
        <g key={cell.key}>
          <rect x={x(cell.x0)} y={y(cell.y1)} width={x(cell.x1) - x(cell.x0)} height={y(cell.y0) - y(cell.y1)} fill={fill[cell.key]} />
          <text
            x={(x(cell.x0) + x(cell.x1)) / 2}
            y={(y(cell.y0) + y(cell.y1)) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="600"
            fill="currentColor"
          >
            {REGIME_LABELS[cell.key]}
          </text>
        </g>
      ))}
      <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(100)} stroke="currentColor" strokeDasharray="3 3" opacity="0.6" />
      <line x1={x(0)} x2={x(100)} y1={y(r)} y2={y(r)} stroke="currentColor" strokeDasharray="3 3" opacity="0.6" />
      <text x={x(t)} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor">{t}</text>
      <text x={x(0)} y={H - 6} textAnchor="start" fontSize="9" fill="currentColor" opacity="0.7">Funding pressure →</text>
      <text x={pad.l - 6} y={y(r)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="currentColor">{r}</text>
      <text transform={`translate(10 ${y(100)}) rotate(90)`} fontSize="9" fill="currentColor" opacity="0.7">Risk appetite →</text>
    </svg>
  );
}

/** Confidence is a three-band ladder on distance to the nearest line, drawn as one. */
function ConfidenceLadder() {
  const near = REGIME_CONFIDENCE_NEAR_THRESHOLD;
  const med = REGIME_CONFIDENCE_MEDIUM_THRESHOLD;
  const max = med * 2;
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <div aria-label={`Confidence: under ${near} points LOW, under ${med} MED, otherwise HIGH.`}>
      <div className="flex h-5 w-full max-w-[20rem] overflow-hidden rounded-sm text-fluid-nano font-semibold">
        <span className="flex items-center justify-center bg-rose-500/30 text-rose-100" style={{ width: pct(near) }}>LOW</span>
        <span className="flex items-center justify-center bg-amber-500/30 text-amber-100" style={{ width: pct(med - near) }}>MED</span>
        <span className="flex items-center justify-center bg-emerald-500/25 text-emerald-100" style={{ width: pct(max - med) }}>HIGH</span>
      </div>
      <div className="relative mt-0.5 h-4 w-full max-w-[20rem] text-fluid-nano tabular-nums text-slate-400">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(near) }}>{near}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(med) }}>{med}</span>
        <span className="absolute right-0">pts to line</span>
      </div>
    </div>
  );
}

/**
 * A saturating linear ramp: zero until `from`, all `points` at `to`. Both score
 * components are this shape, and the prose could only state the two ends.
 */
function RampPlot({ id, from, to, points, unit, label }: { id: string; from: number; to: number; points: number; unit: string; label: string }) {
  const W = 220;
  const H = 90;
  const pad = { l: 28, r: 10, t: 8, b: 22 };
  const x0 = from - (to - from) * 0.4;
  const x1 = to + (to - from) * 0.4;
  const x = (v: number) => pad.l + ((v - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / points) * (H - pad.t - pad.b);
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(2)}${unit}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full max-w-[16rem] text-slate-300" aria-labelledby={`${id}-title`}>
      <title id={`${id}-title`}>{label}</title>
      <line x1={x(x0)} x2={x(x1)} y1={y(0)} y2={y(0)} stroke="currentColor" opacity="0.3" />
      <line x1={x(x0)} x2={x(x0)} y1={y(0)} y2={y(points)} stroke="currentColor" opacity="0.3" />
      <polyline
        points={`${x(x0)},${y(0)} ${x(from)},${y(0)} ${x(to)},${y(points)} ${x(x1)},${y(points)}`}
        fill="none"
        stroke="var(--accent-action)"
        strokeWidth="2"
      />
      <text x={x(from)} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor">{fmt(from)}</text>
      <text x={x(to)} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor">{fmt(to)}</text>
      <text x={pad.l - 4} y={y(points)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="currentColor">{points}</text>
      <text x={pad.l - 4} y={y(0)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="currentColor">0</text>
    </svg>
  );
}

function FormulaCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="weather-hub-card space-y-2 px-4 py-4">
      <p className="type-eyebrow">{title}</p>
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
      {/* A reader who does not already know what a Treasury series or a credit
          spread is cannot start at the formulas. This tier says what the score
          does in words first; the grid below it stays exact. */}
      <div className="weather-surface mb-3 space-y-3 px-4 py-4">
        <p className="type-eyebrow">In plain language</p>
        <ol className="space-y-2 text-sm text-slate-200">
          <li>
            <span className="font-semibold text-slate-100">1. Read two things off public U.S.
            market data.</span>{" "}
            <span className="text-slate-300">
              {signalPlainEnglish.tightness.plainLabel} &mdash;{" "}
              {signalPlainEnglish.tightness.whatItMeasures}{" "}
              {signalPlainEnglish.riskAppetite.plainLabel} &mdash;{" "}
              {signalPlainEnglish.riskAppetite.whatItMeasures}
            </span>
          </li>
          <li>
            <span className="font-semibold text-slate-100">2. Score each one 0&ndash;100.</span>{" "}
            <span className="text-slate-300">
              For funding pressure, {compositeSignalScales.tightness.directionLabel}. For risk
              appetite, {compositeSignalScales.riskAppetite.directionLabel}. Interest rates set most
              of each score; market-stress reads adjust it.
            </span>
          </li>
          <li>
            <span className="font-semibold text-slate-100">3. Turn the pair into one call.</span>{" "}
            <span className="text-slate-300">
              The quadrant the two scores land in is the environment; the diagram below draws it.
            </span>
          </li>
        </ol>
        <p className="text-xs text-slate-400">
          The cards below give the exact arithmetic, including the market terms used in it.{" "}
          <GlossaryLink>Look up a term</GlossaryLink>
        </p>
      </div>

      {/* Wider gutters than a framed grid needs. The depth ladder in
          surfaces.css drops the enclosure on these cards — they sit third
          level and deeper — so spacing and type are what separate them, and
          a 12px gap sized for bordered cards left four unframed blocks
          reading as one run of text. */}
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <FormulaCard title="Inputs — all public">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400">Rates:</span> FRED daily series — DGS1MO (the base
              rate; falls back to DGS3MO), DGS2, DGS10.
              <span className="mt-1 block text-xs text-slate-400">
                FRED is the Federal Reserve&rsquo;s free public data service; each code names one
                published series. DGS1MO is the one-month Treasury bill rate, DGS2 the two-year,
                DGS10 the ten-year.
              </span>
            </li>
            <li>
              <span className="text-slate-400">Stress reads:</span> high-yield credit spread, Chicago
              Fed financial conditions index, VIX, VC funding velocity, tech layoff trend.
              <span className="mt-1 block text-xs text-slate-400">
                In order: the extra interest riskier companies pay to borrow, a Fed summary of
                overall borrowing conditions, expected stock-market turbulence, the pace of venture
                funding, and the tech layoff trend.
              </span>
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title="Funding pressure · 0–100 · cost of money">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <code className="text-sky-200">
                min({TIGHTNESS_BASE_RATE_POINTS}, (base rate − {BASE_RATE_TIGHTNESS_THRESHOLD}) ×{" "}
                {BASE_RATE_TIGHTNESS_MULTIPLIER})
              </code>{" "}

              <RampPlot
                id="ramp-base-rate"
                from={BASE_RATE_TIGHTNESS_THRESHOLD}
                to={baseRateSaturation}
                points={TIGHTNESS_BASE_RATE_POINTS}
                unit="%"
                label={`Rate component: 0 points at ${BASE_RATE_TIGHTNESS_THRESHOLD}%, all ${TIGHTNESS_BASE_RATE_POINTS} at ${baseRateSaturation}%.`}
              />
            </li>
            <li>
              <code className="text-sky-200">
                + min({TIGHTNESS_INVERSION_POINTS}, inversion depth ×{" "}
                {CURVE_INVERSION_TIGHTNESS_MULTIPLIER})
              </code>{" "}
              when the 10Y−2Y curve is inverted.
              <RampPlot
                id="ramp-inversion"
                from={0}
                to={inversionSaturation}
                points={TIGHTNESS_INVERSION_POINTS}
                unit="%"
                label={`Inversion component: 0 points at no inversion, all ${TIGHTNESS_INVERSION_POINTS} at −${inversionSaturation}% inversion depth.`}
              />
            </li>
            <li>
              <code className="text-sky-200">
                + min({BASE_RATE_VELOCITY_POINTS}, (trailing {BASE_RATE_VELOCITY_LOOKBACK_DAYS}-day
                base-rate move − {BASE_RATE_VELOCITY_THRESHOLD}) × {BASE_RATE_VELOCITY_MULTIPLIER})
              </code>{" "}
              when base-rate history is available; the tightening-speed term, so a fast hiking
              cycle counts before the level alone crosses the ramp.
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
            <li>
              <span className="text-slate-400">Market-stress veto:</span> when the trailing{" "}
              {adj.vixVetoMeanWindow}-observation VIX mean is {adj.vixMarketStressVetoMean}+, the
              score is capped at the regime line ({RISK_APPETITE_REGIME_THRESHOLD}); between{" "}
              {adj.vixMarketStressUnwindMean} and {adj.vixMarketStressVetoMean} it is capped at{" "}
              {adj.vixVetoSoftCap}. Extreme realized stress, not the curve, sets the ceiling — the
              posture cannot read better than transitional while it holds.
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title="Regime, headline number, confidence">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400">Regime:</span>
              <RegimeQuadrant />
              <span className="mt-1 block text-xs text-slate-400">
                Near a line or at MED confidence a change must repeat on two consecutive reads; LOW
                blocks the switch.
              </span>
            </li>
            <li>
              <span className="text-slate-400">Boldness (homepage headline):</span>{" "}
              <code className="text-sky-200">0.7 × risk appetite + 0.3 × (100 − funding pressure)</code>
            </li>
            <li>
              <span className="text-slate-400">Confidence:</span> distance to the nearest line.
              <div className="mt-1.5">
                <ConfidenceLadder />
              </div>
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
        </a>{" "}
        For the act / pause / reverse method the thresholds feed, see{" "}
        <a href="#framework" className="inline-flex min-h-[44px] items-center font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
          how to use the thresholds ↓
        </a>
      </p>
    </ReportSection>
  );
}
