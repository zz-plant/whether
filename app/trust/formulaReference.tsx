import type { ReactNode } from "react";
import { MARGIN_LABEL } from "../../lib/report/reportFormatting";
import { ReportSection } from "../components/reportSection";
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
  RISK_GAP_TO_TIGHTNESS_EQUIVALENT,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_INVERSION_POINTS,
  TIGHTNESS_REGIME_THRESHOLD,
} from "../../lib/regimeEngine";
import type { RegimeKey } from "../../lib/regimeEngine";
import { REGIME_HEX_COLORS } from "../../lib/regimePhaseSpace";
import { REGIME_LABELS } from "../../lib/regimePresentation";
import { OPERATING_LATITUDE_GLOSS, OPERATING_LATITUDE_LABEL } from "../../lib/report/reportCopy";
import { ruleMetricLabel } from "../../lib/report/boundedDecisionRules";
import { ScoreLadder, type LadderLine } from "../components/ui/scoreLadder";
import {
  describeRecordBasisInputs,
  isCountedMarketInput,
  type ScoringBasis,
} from "../../lib/report/scoringBasis";

/** One score against its lines, this week and last, as the ladder draws it. */
type ScorePosition = {
  value: number;
  previous: number | null;
  /** What the hollow dot is: the date of the reading it is drawn from, or "Last week" where the week does not date it. */
  previousLabel?: string;
  lines: readonly LadderLine[];
};
export type ScorePositions = { tightness: ScorePosition; riskAppetite: ScorePosition };

/** "How hard…" to "how hard…", for a definition that follows its term mid-sentence. */
const lowerFirst = (sentence: string) => `${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;

const ENGINE_SOURCE_URL = "https://github.com/zz-plant/whether/blob/main/lib/regimeEngineCore.ts";

/** Base rate at which the rate component of tightness saturates. */
const baseRateSaturation =
  BASE_RATE_TIGHTNESS_THRESHOLD + TIGHTNESS_BASE_RATE_POINTS / BASE_RATE_TIGHTNESS_MULTIPLIER;

/** Curve inversion depth at which the inversion component saturates. */
const inversionSaturation = TIGHTNESS_INVERSION_POINTS / CURVE_INVERSION_TIGHTNESS_MULTIPLIER;

const adj = MACRO_ADJUSTMENT_CONSTANTS;

const joinAnd = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const upperFirst = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/**
 * One sentence after a card's list of market reads, naming the ones the record
 * basis leaves out ("The spread and the index are shown, not counted."), or
 * nothing when every read in the list counts. Once per list, not after each.
 */
const shownNotCounted = (reads: ReadonlyArray<[Parameters<typeof isCountedMarketInput>[0], string]>) => {
  const shown = reads.filter(([id]) => !isCountedMarketInput(id)).map(([, name]) => name);
  if (shown.length === 0) return "";
  return ` ${upperFirst(joinAnd(shown))} ${shown.length === 1 ? "is" : "are"} shown, not counted.`;
};

/**
 * What one risk-appetite point is worth in the funding-pressure points that
 * confidence counts (`resolveDistanceToFlip`). Without it a reader who sees risk
 * appetite 6 points from its line and a ladder whose Medium band ends at 12
 * reads "High" as a contradiction.
 */
const riskPointWorth = Number(RISK_GAP_TO_TIGHTNESS_EQUIVALENT.toFixed(1));
const RISK_GAP_EXAMPLE_POINTS = 6;

/**
 * The regime rule is a 2x2: which quadrant the two scores land in. Stated in
 * prose it was one sentence carrying two thresholds and four names; drawn, it
 * is the thing itself. It explains the rule; where this week's scores sit is
 * drawn by the two ladders that open the section, the same drawing every
 * other route uses for a score.
 */
function RegimeQuadrant() {
  const t = TIGHTNESS_REGIME_THRESHOLD;
  const r = RISK_APPETITE_REGIME_THRESHOLD;
  const W = 260;
  const H = 194;
  const pad = { l: 34, r: 8, t: 8, b: 44 };
  const x = (v: number) => pad.l + (v / 100) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / 100) * (H - pad.t - pad.b);
  const cells: Array<{ key: RegimeKey; x0: number; x1: number; y0: number; y1: number }> = [
    { key: "EXPANSION", x0: 0, x1: t, y0: r, y1: 100 },
    { key: "VOLATILE", x0: t, x1: 100, y0: r, y1: 100 },
    { key: "DEFENSIVE", x0: 0, x1: t, y0: 0, y1: r },
    { key: "SCARCITY", x0: t, x1: 100, y0: 0, y1: r },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="weather-data-plot h-auto w-full max-w-[20rem] text-slate-300" aria-labelledby="regime-quadrant-title">
      <title id="regime-quadrant-title">
        {`Four conditions: funding pressure above ${t} and risk appetite below ${r} pick the weather.`}
      </title>
      {cells.map((cell) => (
        <g key={cell.key}>
          <rect x={x(cell.x0)} y={y(cell.y1)} width={x(cell.x1) - x(cell.x0)} height={y(cell.y0) - y(cell.y1)} fill={REGIME_HEX_COLORS[cell.key]} fillOpacity="0.16" />
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
      <text x={x(t)} y={H - 26} textAnchor="middle" fontSize="12" fill="currentColor">{t}</text>
      <text x={x(0)} y={H - 6} textAnchor="start" fontSize="11" fill="currentColor" opacity="0.7">Funding pressure →</text>
      <text x={pad.l - 6} y={y(r)} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="currentColor">{r}</text>
      <text textAnchor="middle" transform={`translate(11 ${(y(100) + y(0)) / 2}) rotate(-90)`} fontSize="11" fill="currentColor" opacity="0.7">Risk appetite →</text>
    </svg>
  );
}

/**
 * Confidence is a three-band ladder on distance to the nearest line, drawn as one.
 * The bands are named in words, as every reader surface names them: the engine's
 * LOW / MED / HIGH codes are storage, not copy.
 */
function ConfidenceLadder() {
  const near = REGIME_CONFIDENCE_NEAR_THRESHOLD;
  const med = REGIME_CONFIDENCE_MEDIUM_THRESHOLD;
  const max = med * 2;
  const pct = (v: number) => `${(v / max) * 100}%`;
  return (
    <div aria-label={`${MARGIN_LABEL}: under ${near} points from the line is close, under ${med} is within reach, otherwise clear.`}>
      <div className="flex h-5 w-full max-w-[20rem] overflow-hidden rounded-sm text-fluid-nano font-semibold">
        <span className="flex items-center justify-center bg-rose-500/30 text-rose-100" style={{ width: pct(near) }}>Close</span>
        <span className="flex items-center justify-center bg-amber-500/30 text-amber-100" style={{ width: pct(med - near) }}>Within reach</span>
        <span className="flex items-center justify-center bg-emerald-500/25 text-emerald-100" style={{ width: pct(max - med) }}>Clear</span>
      </div>
      <div className="relative mt-0.5 h-4 w-full max-w-[20rem] text-fluid-nano tabular-nums text-slate-400">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(near) }}>{near}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(med) }}>{med}</span>
        <span className="absolute right-0">points from the line</span>
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
    <svg viewBox={`0 0 ${W} ${H}`} className="weather-data-plot mt-2 h-auto w-full max-w-[20rem] text-slate-300" aria-labelledby={`${id}-title`}>
      <title id={`${id}-title`}>{label}</title>
      <line x1={x(x0)} x2={x(x1)} y1={y(0)} y2={y(0)} stroke="currentColor" opacity="0.3" />
      <line x1={x(x0)} x2={x(x0)} y1={y(0)} y2={y(points)} stroke="currentColor" opacity="0.3" />
      <polyline
        points={`${x(x0)},${y(0)} ${x(from)},${y(0)} ${x(to)},${y(points)} ${x(x1)},${y(points)}`}
        fill="none"
        stroke="var(--accent-action)"
        strokeWidth="2"
      />
      <text x={x(from)} y={H - 6} textAnchor="middle" fontSize="11" fill="currentColor">{fmt(from)}</text>
      <text x={x(to)} y={H - 6} textAnchor="middle" fontSize="11" fill="currentColor">{fmt(to)}</text>
      <text x={pad.l - 4} y={y(points)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="currentColor">{points}</text>
      <text x={pad.l - 4} y={y(0)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="currentColor">0</text>
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
export function FormulaReference({
  positions,
  scoringBasis,
}: {
  positions?: ScorePositions;
  /** This reading's basis: what the inputs left out would make each score (`ReportData.scoringBasis`). */
  scoringBasis?: Pick<ScoringBasis, "notCounted">;
} = {}) {
  const recordBasis = describeRecordBasisInputs();
  return (
    <ReportSection
      id="formula-reference"
      title="How the scores are built"
      description="The full derivation, from public data series to the weekly guidance."
    >
      {/* Where the score sits, first, and in the one drawing every route uses
          for it. The quadrant further down used to be the only picture of the
          two scores on this page, and it draws the rule, not the reading. */}
      {positions ? (
        <div className="weather-surface mb-3 grid gap-x-8 gap-y-4 px-4 py-4 sm:grid-cols-2">
          <ScoreLadder
            label={ruleMetricLabel.tightness}
            value={positions.tightness.value}
            previous={positions.tightness.previous}
            previousLabel={positions.tightness.previousLabel}
            lines={positions.tightness.lines}
          />
          <ScoreLadder
            label={ruleMetricLabel.riskAppetite}
            value={positions.riskAppetite.value}
            previous={positions.riskAppetite.previous}
            previousLabel={positions.riskAppetite.previousLabel}
            lines={positions.riskAppetite.lines}
          />
        </div>
      ) : null}

      {/* A reader who does not already know what a Treasury series or a credit
          spread is cannot start at the formulas. This tier says what the score
          does in words first; the grid below it stays exact. */}
      <div className="weather-surface mb-3 space-y-3 px-4 py-4">
        <p className="type-eyebrow">In plain language</p>
        <ol className="space-y-2 text-sm text-slate-200">
          <li>
            <span className="font-semibold text-slate-100">1. Read two things off public U.S.
            market data.</span>{" "}
            {/* "Funding pressure is how hard…", one sentence each. With an em dash
                the definition's own capital ("Funding pressure — How hard…")
                read as a new sentence starting mid-line. */}
            <span className="text-slate-300">
              {signalPlainEnglish.tightness.plainLabel} is {lowerFirst(signalPlainEnglish.tightness.whatItMeasures)}{" "}
              {signalPlainEnglish.riskAppetite.plainLabel} is {lowerFirst(signalPlainEnglish.riskAppetite.whatItMeasures)}
            </span>
          </li>
          <li>
            <span className="font-semibold text-slate-100">2. Score each one 0&ndash;100.</span>{" "}
            <span className="text-slate-300">
              For funding pressure, {compositeSignalScales.tightness.directionLabel}. For risk
              appetite, {compositeSignalScales.riskAppetite.directionLabel}. Interest rates set most
              of each score. Market reads adjust it, and step 3 says which of them count.
            </span>
          </li>
          {/* The record basis (2026-10-09). Until then every market read moved the
              scores, and four published weeks read Freezing on inputs the record
              could not test, while their month-end, scored on the record's, read
              Cloudy. The lists come from the engine's own set, so a read that
              joins the archive moves here when it moves there. */}
          <li id="record-basis">
            <span className="font-semibold text-slate-100">3. Count only what the record can test.</span>{" "}
            <span className="text-slate-300">
              {upperFirst(joinAnd(recordBasis.counted))} move the scores. The record holds each of them
              at every month-end since 2012, so the history on the Record and the calibration study
              test the same score that sets the guidance.
              {recordBasis.shownBecause.length > 0
                ? ` ${upperFirst(recordBasis.shownBecause.join("; "))}. Each is scored and shown, and moves nothing.`
                : null}
            </span>
            {scoringBasis && scoringBasis.notCounted.length > 0 ? (
              <span className="mt-1 block text-slate-300" data-not-counted>
                This week they would put{" "}
                {joinAnd(
                  scoringBasis.notCounted.map(
                    (entry) => `${ruleMetricLabel[entry.metric].toLowerCase()} at ${entry.score}, where the published score is ${entry.published}`,
                  ),
                )}
                .
              </span>
            ) : null}
          </li>
          <li>
            <span className="font-semibold text-slate-100">4. Turn the pair into conditions.</span>{" "}
            <span className="text-slate-300">
              The quadrant the two scores land in is the environment; the diagram below draws it.
            </span>
          </li>
        </ol>
        {/* No link out for the market terms: each card below says what its own terms
            mean, so the arithmetic can be read without leaving it. It opened on "The
            exact arithmetic is below.", over the "Show the exact arithmetic" control
            directly beneath it (2026-10-09). */}
        <p className="text-xs text-slate-400">
          Each card below says what its market terms mean.
        </p>
      </div>

      {/* Wider gutters than a framed grid needs. The depth ladder in
          surfaces.css drops the enclosure on these cards — they sit third
          level and deeper — so spacing and type are what separate them, and
          a 12px gap sized for bordered cards left four unframed blocks
          reading as one run of text. */}
      {/* Folded since 2026-09-30. Open, the four cards were most of this page
          on a phone (9.2 screens) and the formula lines drew the eye ahead of the
          status strip a reader comes here to check. The ladders and the plain
          steps above stay open; the arithmetic is one tap away and still
          server-rendered, so a search engine and a find-in-page both reach it. */}
      <details className="weather-auto-chevron group mb-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
          Show the exact arithmetic
        </summary>
      <div className="mt-4 grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <FormulaCard title="Inputs — all public">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400">Rates:</span> St. Louis Fed (FRED) daily series DGS1MO,
              DGS2 and DGS10, with DGS3MO standing in when DGS1MO is missing.
              <span className="mt-1 block text-xs text-slate-400">
                FRED is the St. Louis Fed&rsquo;s free public data service; each code names one
                published series. DGS1MO is the one-month Treasury bill rate, and the cards below
                call it the short-term borrowing rate. DGS3MO is the three-month bill, DGS2 the
                two-year rate and DGS10 the ten-year.
              </span>
            </li>
            <li>
              <span className="text-slate-400">Market reads that count:</span> {joinAnd(recordBasis.countedMarket)}.
              <span className="mt-1 block text-xs text-slate-400">
                The two score cards below say what each one measures, beside the arithmetic that uses it.
              </span>
            </li>
            {recordBasis.shown.length > 0 ? (
              <li>
                <span className="text-slate-400">Shown, not counted:</span>{" "}
                {joinAnd(recordBasis.shown)}. The record has no month-end history for them to be tested on.
              </li>
            ) : null}
          </ul>
        </FormulaCard>

        <FormulaCard title="Funding pressure · 0–100 · cost of money">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <code className="text-sky-200">
                min({TIGHTNESS_BASE_RATE_POINTS}, (short-term borrowing rate − {BASE_RATE_TIGHTNESS_THRESHOLD}) ×{" "}
                {BASE_RATE_TIGHTNESS_MULTIPLIER})
              </code>{" "}
              The short-term borrowing rate is read in percent.

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
              when the recession warning gauge (10-year minus 2-year rate) is inverted: the ten-year
              rate is below the two-year. Inversion depth is how far below, in percentage points.
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
                + min({BASE_RATE_VELOCITY_POINTS}, ({BASE_RATE_VELOCITY_LOOKBACK_DAYS}-day rise in the
                short-term borrowing rate − {BASE_RATE_VELOCITY_THRESHOLD}) × {BASE_RATE_VELOCITY_MULTIPLIER})
              </code>{" "}
              when {BASE_RATE_VELOCITY_LOOKBACK_DAYS} days of rate history are available. This is the
              speed term: rates rising fast count before their level alone reaches the ramp above.
            </li>
            <li>
              <span className="text-slate-400">Stress add-ons:</span> a high-yield credit spread ≥{" "}
              {adj.hySpreadStressThreshold}% adds up to +{adj.hySpreadTightnessCap}; the Chicago Fed
              financial conditions index ≥ {adj.chicagoFciTighteningThreshold} adds up to +
              {adj.chicagoFciTightnessCap}.
              {shownNotCounted([
                ["HY_CREDIT_SPREAD", "the spread"],
                ["CHICAGO_FCI", "the index"],
              ])}
              <span className="mt-1 block text-xs text-slate-400">
                The high-yield credit spread is the extra interest riskier companies pay to borrow,
                over the government&rsquo;s rate. The Chicago Fed index summarises borrowing
                conditions across markets: zero is average, above zero is tighter than average.
              </span>
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title="Risk appetite · 0–100 · willingness to fund risk">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              Recession warning gauge, mapped linearly: {RISK_APPETITE_MIN_SLOPE}% → 0,{" "}
              +{RISK_APPETITE_MAX_SLOPE}% → 100. The further the ten-year rate sits above the
              two-year, the more willing lenders are to wait for a return.
            </li>
            <li>
              <span className="text-slate-400">Deductions:</span> the VIX ≥ {adj.vixShockThreshold}{" "}
              subtracts up to {adj.vixRiskAppetiteCap}; venture funding pace ≤{" "}
              {adj.vcVelocitySlowdownThreshold}% subtracts up to {adj.vcVelocityRiskAppetiteCap};
              the tech layoff index ≥ {adj.layoffPressureThreshold} subtracts up to {adj.layoffRiskAppetiteCap}.
              {shownNotCounted([
                ["VIX_INDEX", "the VIX"],
                ["VC_FUNDING_VELOCITY", "the funding pace"],
                ["TECH_LAYOFF_TREND", "the layoff index"],
              ])}
              <span className="mt-1 block text-xs text-slate-400">
                The VIX is the stock market&rsquo;s own forecast of turbulence over the next month;
                higher means more expected swings. Venture funding pace is the quarter-over-quarter
                change in venture money invested. The layoff index is a composite of tech layoff
                reports; higher means more layoffs.
              </span>
            </li>
            <li>
              <span className="text-slate-400">Market-stress cap:</span> when the VIX has averaged{" "}
              {adj.vixMarketStressVetoMean} or more over its last {adj.vixVetoMeanWindow} readings,
              the score is capped at the line where conditions change ({RISK_APPETITE_REGIME_THRESHOLD});
              between {adj.vixMarketStressUnwindMean} and {adj.vixMarketStressVetoMean} it is capped at{" "}
              {adj.vixVetoSoftCap}. It uses an average rather than one day, so a single spike does not
              cap a week. While the cap holds, extreme market stress sets the ceiling, not the rates.
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title={`Conditions, ${OPERATING_LATITUDE_LABEL.toLowerCase()}, margin`}>
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400">Conditions:</span>
              <RegimeQuadrant />
              <span className="mt-1 block text-xs text-slate-400">
                At the narrowest margin conditions do not change at all.
              </span>
            </li>
            <li>
              <span className="text-slate-400">{OPERATING_LATITUDE_LABEL}:</span>{" "}
              <code className="text-sky-200">0.7 × risk appetite + 0.3 × (100 − funding pressure)</code>
              <span className="mt-1 block text-xs text-slate-400">
                The 0–100 score beside each month on the history page and in the copied and Slack
                briefs. It measures {OPERATING_LATITUDE_GLOSS}.
              </span>
            </li>
            <li>
              <span className="text-slate-400">{MARGIN_LABEL}:</span> how far the scores sit from the
              nearest line where conditions would change, counted in funding-pressure points. A
              risk-appetite point is worth {riskPointWorth}, because it stands for a{" "}
              {riskPointWorth}-times larger move in rates: risk appetite {RISK_GAP_EXAMPLE_POINTS} points
              from its line is {Math.round(RISK_GAP_EXAMPLE_POINTS * RISK_GAP_TO_TIGHTNESS_EQUIVALENT)} points away.
              <div className="mt-1.5">
                <ConfidenceLadder />
              </div>
            </li>
          </ul>
        </FormulaCard>
      </div>
      </details>

      {/* The link sits inside the sentence, so it is inline with vertical
          padding rather than a 44px inline-flex box: padding on an inline box
          widens what a finger can hit without raising the line it sits on (§II,
          "expand invisible hitboxes"). A second link here, to how to use the
          pause and resume lines on /about, went where the line closing /trust
          already points (2026-10-09). */}
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Every constant above is read from the scoring engine, so a change there changes this
        page.{" "}
        <a
          href={ENGINE_SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="py-3 font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
        >
          Read the engine source →
        </a>
      </p>
    </ReportSection>
  );
}
