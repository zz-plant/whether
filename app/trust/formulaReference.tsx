import type { ReactNode } from "react";
import { MARGIN_LABEL } from "../../lib/report/reportFormatting";
import { ReportSection } from "../components/reportSection";
import { SCORES_QUESTION } from "./trustQuestions";
import { UrlDetails } from "../components/ui/urlDetails";
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
import { SHOCK_CROSSING_POINTS } from "../../lib/regimeStateMachine";
import { REGIME_LABELS } from "../../lib/regimePresentation";
import { OPERATING_LATITUDE_GLOSS, OPERATING_LATITUDE_LABEL } from "../../lib/report/reportCopy";
import { ruleMetricLabel } from "../../lib/report/boundedDecisionRules";
import { ActionLink } from "../components/ui/actionLink";
import {
  describeRecordBasisInputs,
  isCountedMarketInput,
  type ScoringBasis,
} from "../../lib/report/scoringBasis";
import type { ScoreComposition } from "../../lib/report/scoreComposition";
import { ScoreCompositionFigure } from "./scoreCompositionFigure";
import type { RateDial } from "../../lib/report/rateScenario";

/** "How hard…" to "how hard…", for a definition that follows its term mid-sentence. */
const lowerFirst = (sentence: string) => `${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;

/* The premise test: the candidate rate ramps scored beside each reading, and the rule that
   decides whether one replaces the current ramp, fixed before any result (2026-10-09). Served
   from this site: the repository is private, so its GitHub copies are a 404 for readers. */
const RAMP_TEST_REGISTRATION_URL = "/research/premise-test-registration.md";
const RAMP_TEST_RESULTS_URL = "/research/premise-test-results.md";

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
 *
 * Risk appetite runs across and funding pressure up, the orientation of the
 * brief's conditions map (`RegimeRadar`) and `/history`'s phase map: Freezing
 * top left, Sunny bottom right. Until 2026-10-09 this one had the axes the
 * other way round, so a reader who learned the map on `/` met Sunny in the
 * corner where Freezing had been.
 */
function RegimeQuadrant() {
  const t = TIGHTNESS_REGIME_THRESHOLD;
  const r = RISK_APPETITE_REGIME_THRESHOLD;
  const W = 260;
  const H = 194;
  const pad = { l: 34, r: 8, t: 8, b: 44 };
  const x = (v: number) => pad.l + (v / 100) * (W - pad.l - pad.r);
  /* Funding pressure rises downward, as on every conditions map (2026-11-03). */
  const y = (v: number) => pad.t + (v / 100) * (H - pad.t - pad.b);
  /* x is risk appetite (its line at r), y is funding pressure (its line at t). */
  const cells: Array<{ key: RegimeKey; x0: number; x1: number; y0: number; y1: number }> = [
    { key: "SCARCITY", x0: 0, x1: r, y0: t, y1: 100 },
    { key: "DEFENSIVE", x0: r, x1: 100, y0: t, y1: 100 },
    { key: "VOLATILE", x0: 0, x1: r, y0: 0, y1: t },
    { key: "EXPANSION", x0: r, x1: 100, y0: 0, y1: t },
  ];
  return (
    /* 254px wide on a 320px phone: 12.5 units draw the labels at 12px (typography.css). */
    <svg viewBox={`0 0 ${W} ${H}`} className="weather-data-plot weather-phone-labels h-auto w-full max-w-[20rem] text-slate-300 [--phone-label:12.5px]" aria-labelledby="regime-quadrant-title">
      <title id="regime-quadrant-title">
        {`Four conditions, picked by whether funding pressure is above ${t} and whether risk appetite is below ${r}.`}
      </title>
      {cells.map((cell) => (
        <g key={cell.key}>
          <rect x={x(cell.x0)} y={y(cell.y0)} width={x(cell.x1) - x(cell.x0)} height={y(cell.y1) - y(cell.y0)} fill={REGIME_HEX_COLORS[cell.key]} fillOpacity="0.16" />
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
      <line x1={x(r)} x2={x(r)} y1={y(0)} y2={y(100)} stroke="currentColor" strokeDasharray="3 3" opacity="0.6" />
      <line x1={x(0)} x2={x(100)} y1={y(t)} y2={y(t)} stroke="currentColor" strokeDasharray="3 3" opacity="0.6" />
      <text x={x(r)} y={H - 26} textAnchor="middle" fontSize="12" fill="currentColor">{r}</text>
      <text x={x(0)} y={H - 6} textAnchor="start" fontSize="11" fill="currentColor" opacity="0.7">Risk appetite →</text>
      <text x={pad.l - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="currentColor">{t}</text>
      <text textAnchor="middle" transform={`translate(11 ${(y(100) + y(0)) / 2}) rotate(-90)`} fontSize="11" fill="currentColor" opacity="0.7">← Funding pressure</text>
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
    <div aria-label={`${MARGIN_LABEL}: under ${near} points is little, under ${med} is some, otherwise plenty.`}>
      <div className="flex h-5 w-full max-w-[20rem] overflow-hidden rounded-sm text-fluid-nano font-semibold">
        <span className="flex items-center justify-center bg-rose-500/30 text-rose-100" style={{ width: pct(near) }}>Little</span>
        <span className="flex items-center justify-center bg-amber-500/30 text-amber-100" style={{ width: pct(med - near) }}>Some</span>
        <span className="flex items-center justify-center bg-emerald-500/25 text-emerald-100" style={{ width: pct(max - med) }}>Plenty</span>
      </div>
      <div className="relative mt-0.5 h-4 w-full max-w-[20rem] text-fluid-nano tabular-nums text-slate-400">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(near) }}>{near}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(med) }}>{med}</span>
        <span className="absolute right-0">points from a change</span>
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
        stroke="currentColor"
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
  scoringBasis,
  composition = null,
  rateDial = null,
  plainLanguageFolded = false,
  plainLanguageOpen = false,
  question = SCORES_QUESTION,
}: {
  /** The heading's question and the sentence that answers it, the words the page's markup carries. */
  question?: { question: string; answer: string };
  /** This reading's basis: what the inputs left out would make each score (`ReportData.scoringBasis`). */
  scoringBasis?: Pick<ScoringBasis, "notCounted">;
  /** This week's two scores, input by input (`buildScoreComposition`); null when the engine cannot rebuild them. */
  composition?: { tightness: ScoreComposition; riskAppetite: ScoreComposition } | null;
  /** Funding pressure at other short rates, for the control on its bar (`buildRateDial`), with the rate the URL names. */
  rateDial?: (RateDial & { initialRate?: number }) | null;
  /** Fold the plain-language derivation behind `?derivation` on a stable week (the page decides; see the call site). */
  plainLanguageFolded?: boolean;
  /** The server-resolved open state for that fold (`?derivation=1`). */
  plainLanguageOpen?: boolean;
} = {}) {
  const recordBasis = describeRecordBasisInputs();
  /* The plain-language tier, lifted out so it can render open or folded from
   * one definition. */
  const plainLanguageTier = (
        <div className="weather-surface mb-3 space-y-3 px-4 py-4">
          {/* Folded, the summary above already says "In plain language". */}
          {plainLanguageFolded ? null : <p className="type-eyebrow">In plain language</p>}
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
                {upperFirst(joinAnd(recordBasis.counted))} move the scores. Each has month-end history since 2012.
                {recordBasis.shownBecause.length > 0
                  ? ` ${upperFirst(recordBasis.shownBecause.join("; "))}. We score and show each of them, but none of them moves the scores.`
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
                The quadrant the two scores land in sets the conditions.
              </span>
            </li>
          </ol>
          {/* No link out for the market terms: each card below says what its own terms
              mean, so the arithmetic can be read without leaving it. No sentence
              announcing that either (2026-10-14): it opened on "The exact arithmetic is
              below.", over the control directly beneath it, and then on "Each card below
              says what its market terms mean." — both described the page to its reader. */}
        </div>
  );

  return (
    /* The question, and its answer first (2026-11-25): it was "How the scores are built" with
       no description, since "The full derivation, from public data series to the weekly
       guidance" restated the heading (2026-11-11). The answer is the plain steps' gist. */
    <ReportSection id="formula-reference" title={question.question} description={question.answer}>
      {/* Where this week's scores sit is the brief's section, linked; this page drew the
          same two ladders, pause, change and restart lines and all, until 2026-10-27. What
          follows is how the scores are made. */}
      <p className="mb-3 text-sm text-slate-300">
        <ActionLink href="/#what-would-change" variant="inline">
          Where this week&rsquo;s scores sit against their lines
        </ActionLink>
        , on the brief.
      </p>

      {/* What this week's scores are made of, open (§XII): the claim this section
          checks, drawn beside the sentence that states it. The method behind
          each part stays in the folds below. */}
      {composition ? <ScoreCompositionFigure composition={composition} rateDial={rateDial} /> : null}

      {/* A reader who does not already know what a Treasury series or a credit
          spread is cannot start at the formulas. This tier says what the score
          does in words first; the grid below it stays exact.

          On a stable week (no warnings, live sources) the tier folds behind the
          same chevron register as the arithmetic below it — DD-040's open item:
          the method held the page on a quiet week, ahead of the source board a
          scanner comes here to check. The ladders above stay open (they are the
          reading), and a degraded week renders it open: a reader distrusting the
          data meets the derivation unprompted. `?derivation=1` opens it from a
          link (§XII); the summary names what is behind it. */}
      {plainLanguageFolded ? (
        <UrlDetails
          queryKey="derivation"
          initialOpen={plainLanguageOpen}
          className="weather-auto-chevron group mb-3"
          summaryClassName="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100"
          summary="In plain language — what each score reads, and how the pair sets the conditions"
        >
          <div className="mt-4">{plainLanguageTier}</div>
        </UrlDetails>
      ) : (
        plainLanguageTier
      )}

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
      <div className="mt-4 weather-grid gap-x-10 gap-y-8 [--col-min:22rem] [--grid-max:2]">
        <FormulaCard title="Inputs — all public">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400">Rates:</span> St. Louis Fed (FRED) daily series DGS1MO (one-month Treasury bill rate, or DGS3MO fallback), DGS2 (2-year), and DGS10 (10-year).
            </li>
            <li>
              <span className="text-slate-400">Market reads that count:</span> {joinAnd(recordBasis.countedMarket)}.
            </li>
            {recordBasis.shown.length > 0 ? (
              <li>
                <span className="text-slate-400">Shown, not counted:</span>{" "}
                {joinAnd(recordBasis.shown)}. The record has no month-end history to score them against.
              </li>
            ) : null}
          </ul>
        </FormulaCard>

        <FormulaCard title="Funding pressure · 0–100 · cost of money">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <code className="text-slate-100">
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
              <code className="text-slate-100">
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
              <code className="text-slate-100">
                + min({BASE_RATE_VELOCITY_POINTS}, ({BASE_RATE_VELOCITY_LOOKBACK_DAYS}-day rise in the
                short-term borrowing rate − {BASE_RATE_VELOCITY_THRESHOLD}) × {BASE_RATE_VELOCITY_MULTIPLIER})
              </code>{" "}
              when {BASE_RATE_VELOCITY_LOOKBACK_DAYS} days of rate history exist (catches fast rate rises before the level alone hits the ramp).
            </li>
            <li>
              <span className="text-slate-400">Stress add-ons:</span> high-yield credit spread ≥{" "}
              {adj.hySpreadStressThreshold}% adds up to +{adj.hySpreadTightnessCap}; Chicago Fed
              financial conditions index ≥ {adj.chicagoFciTighteningThreshold} adds up to +
              {adj.chicagoFciTightnessCap}.
              {shownNotCounted([
                ["HY_CREDIT_SPREAD", "the spread"],
                ["CHICAGO_FCI", "the index"],
              ])}
              <span className="mt-1 block text-xs text-slate-400">
                High-yield spread = extra interest riskier companies pay to borrow over Treasuries. Chicago Fed index: zero is average, above zero is tighter than average.
              </span>
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title="Risk appetite · 0–100 · willingness to fund risk">
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              Recession warning gauge, mapped linearly: {RISK_APPETITE_MIN_SLOPE}% → 0,{" "}
              +{RISK_APPETITE_MAX_SLOPE}% → 100 (higher 10Y–2Y spread means more willingness to fund long-term risk).
            </li>
            <li>
              <span className="text-slate-400">Deductions:</span> VIX ≥ {adj.vixShockThreshold}{" "}
              subtracts up to {adj.vixRiskAppetiteCap}; venture funding pace ≤{" "}
              {adj.vcVelocitySlowdownThreshold}% subtracts up to {adj.vcVelocityRiskAppetiteCap};
              tech layoff index ≥ {adj.layoffPressureThreshold} subtracts up to {adj.layoffRiskAppetiteCap}.
              {shownNotCounted([
                ["VIX_INDEX", "the VIX"],
                ["VC_FUNDING_VELOCITY", "the funding pace"],
                ["TECH_LAYOFF_TREND", "the layoff index"],
              ])}
              <span className="mt-1 block text-xs text-slate-400">
                VIX = forecast of turbulence over the next month. Venture funding pace = QoQ change in VC dollars. Layoff index = composite of tech layoff reports.
              </span>
            </li>
            <li>
              <span className="text-slate-400">Market-stress cap:</span> {adj.vixVetoMeanWindow}-reading VIX average ≥{" "}
              {adj.vixMarketStressVetoMean} caps risk appetite at {RISK_APPETITE_REGIME_THRESHOLD}; between{" "}
              {adj.vixMarketStressUnwindMean} and {adj.vixMarketStressVetoMean}, caps it at {adj.vixVetoSoftCap} (averaged so a single-day spike cannot cap a week).
            </li>
          </ul>
        </FormulaCard>

        <FormulaCard title={`Conditions, ${OPERATING_LATITUDE_LABEL.toLowerCase()}, ${MARGIN_LABEL.toLowerCase()}`}>
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>
              <span className="text-slate-400">Conditions:</span>
              <RegimeQuadrant />
              <span className="mt-1 block text-xs text-slate-400">
                {/* A rule, not a record (2026-11-03): the state machine holds conditions while
                    the margin is at its lowest band and lets only a shock crossing through. */}
                With little {MARGIN_LABEL.toLowerCase()}, conditions hold unless one reading moves a score{" "}
                {SHOCK_CROSSING_POINTS}+ points past the change line from more than{" "}
                {REGIME_CONFIDENCE_NEAR_THRESHOLD} points away.
              </span>
            </li>
            <li>
              <span className="text-slate-400">{OPERATING_LATITUDE_LABEL}:</span>{" "}
              <code className="text-slate-100">0.7 × risk appetite + 0.3 × (100 − funding pressure)</code>
              <span className="mt-1 block text-xs text-slate-400">
                0–100 score shown on history and copied briefs; measures {OPERATING_LATITUDE_GLOSS}.
              </span>
            </li>
            <li>
              <span className="text-slate-400">{MARGIN_LABEL}:</span> distance to the nearest change line in
              funding-pressure points (a risk-appetite point is worth {riskPointWorth}, so {RISK_GAP_EXAMPLE_POINTS} pts
              on risk appetite = {Math.round(RISK_GAP_EXAMPLE_POINTS * RISK_GAP_TO_TIGHTNESS_EQUIVALENT)} pts away).
              <div className="mt-1.5">
                <ConfidenceLadder />
              </div>
            </li>
          </ul>
        </FormulaCard>
      </div>
      </details>

      {/* No closing line about the engine (2026-10-27). "Every constant above is read
          from the scoring engine, so a change there changes this page" described how
          the page is built, and its "Read the engine source" link went to the private
          repository, a 404 for every reader. */}
      {/* One line, here and nowhere else: the method note for a change under test. */}
      <p className="mt-2 text-xs leading-5 text-slate-400" data-ramp-test-note>
        Three candidate short-rate ramps are scored alongside each reading; none of them sets the guidance.{" "}
        <a
          href={RAMP_TEST_REGISTRATION_URL}
          className="py-3 font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
        >
          The test, registered in advance →
        </a>{" "}
        <a
          href={RAMP_TEST_RESULTS_URL}
          className="py-3 font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
        >
          What it found →
        </a>
      </p>
    </ReportSection>
  );
}
