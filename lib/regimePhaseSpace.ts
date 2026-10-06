/**
 * The regime classifier, read as a plane rather than as two rails.
 *
 * `classifyFromSignals` in `regimeStateMachine.ts` is a 2x2 split: funding
 * pressure against `tightnessRegime`, risk appetite against `riskAppetiteRegime`.
 * Every surface so far has rendered those two comparisons as separate readouts,
 * which is a lossy projection of a two-dimensional rule — a reader holding
 * "pressure 50" and "appetite 59" still has to do the join in their head to learn
 * which quadrant the call sits in, and cannot see how far the reading is from the
 * *other* boundary at all.
 *
 * This module holds the geometry and the derived facts; the drawing lives in
 * `app/components/history/RegimePhaseMap.tsx`. Splitting them keeps the arithmetic
 * testable without a DOM, which matters because the quadrant rule here has to stay
 * in step with the state machine's.
 *
 * ## Why there is no single "distance to the boundary" here
 *
 * There is a real temptation to draw one leader line from the reading to the
 * nearest corner and call its length the distance to a flip. That would encode a
 * claim the engine explicitly refuses to make. `RISK_GAP_TO_TIGHTNESS_EQUIVALENT`
 * in `regimeEngineCore.ts` records that the two axes move 4.5x apart per point of
 * their underlying driver, which is why `resolveDistanceToFlip` converts before it
 * compares. A Euclidean distance across a square plot re-asserts the equivalence
 * that constant exists to deny, and it does so invisibly — the reader sees a
 * length, not a unit conversion.
 *
 * So the plane keeps both gaps separate and axis-aligned: one horizontal, one
 * vertical, each labelled in its own points. A plot that refuses to collapse two
 * scales into one number is the entire argument for plotting them at all.
 */
import type { RegimeKey } from "./types";
import { REGIME_ORDER, REGIME_LABELS } from "./regimePresentation";
import { DEFAULT_THRESHOLDS, type RegimeThresholds } from "./regimeEngineCore";
import { regimeSignalLabel } from "./report/signalTranslations";

/**
 * Regime hues, in hex, for canvases that cannot resolve a CSS class — SVG fills
 * and the timeline rail both read this. `app/components/TimelineBar.tsx` held an
 * identical literal and now imports this one; `app/viewModel.ts` keeps the same
 * mapping in Tailwind class form, which is a different representation rather than
 * a duplicate value.
 *
 * Not yet the whole story. `app/api/og/briefChartTemplate.tsx` and
 * `compareTemplate.tsx` carry a third mapping at the 400 level, and in both of
 * them DEFENSIVE and VOLATILE are swapped relative to every on-site surface — a
 * shared card paints Cloudy sky-blue and Stormy amber. That is a real defect in a
 * shared artifact, but correcting it re-colours published OG images, so it wants
 * its own change rather than riding along with a chart.
 */
export const REGIME_HEX_COLORS: Record<RegimeKey, string> = {
  EXPANSION: "#10b981", // emerald-500
  SCARCITY: "#f43f5e", // rose-500
  DEFENSIVE: "#f59e0b", // amber-500
  // Violet, not sky. Sky is the action accent — every link, button and focus
  // ring on the site — so under a Stormy call the regime and the controls
  // were one colour. The regime set is now four hues no control borrows.
  VOLATILE: "#8b5cf6", // violet-500
};

/** Score at which `tightness` stops distinguishing between expensive and very
 *  expensive money. Points sitting exactly here are clipped readings, not
 *  measurements, and the plane says so rather than drawing them as ordinary. */
const TIGHTNESS_SCORE_CEILING = 100;

type PhaseAxis = "tightness" | "riskAppetite";

export type PhasePoint = {
  recordDate: string;
  /** "Jul 2026" — formatted once here so the SVG and the table agree. */
  monthLabel: string;
  tightness: number;
  riskAppetite: number;
  regime: RegimeKey;
  regimeLabel: string;
  /** The published call differs from the month before it. */
  changed: boolean;
  /** Funding pressure is pinned at the ceiling, so this reading is clipped. */
  saturated: boolean;
};

type PhaseGap = {
  axis: PhaseAxis;
  /** What the axis is called on screen. */
  label: string;
  /** Signed distance from the boundary, in that axis's own score points. */
  delta: number;
  distance: number;
  side: "above" | "below" | "on";
  /** Where the call lands if this axis alone crosses and the other holds. */
  flipsTo: RegimeKey;
  flipsToLabel: string;
};

type PhaseOccupancy = {
  regime: RegimeKey;
  regimeLabel: string;
  months: number;
  /** 0-1 of the covered record. */
  share: number;
};

type RegimePhaseModel = {
  /** Whole record, oldest first. */
  points: PhasePoint[];
  current: PhasePoint;
  /** Trailing window, drawn as individual markers rather than as trace. */
  recent: PhasePoint[];
  /** Months where the published call changed, oldest first. */
  changes: PhasePoint[];
  thresholds: { tightness: number; riskAppetite: number };
  gaps: Record<PhaseAxis, PhaseGap>;
  occupancy: PhaseOccupancy[];
  /** Months whose funding pressure was clipped at the ceiling. */
  saturatedMonths: number;
};

export type PhaseSeriesEntry = {
  recordDate: string;
  regime: RegimeKey;
  tightness: number;
  riskAppetite: number;
};

/**
 * The quadrant rule, restated for coordinates that did not come from an
 * assessment — a hypothetical, or one axis of a real reading moved across its
 * line. It mirrors `classifyFromSignals`, including the boundaries being
 * exclusive above and inclusive at the line.
 *
 * It deliberately does not model the state machine's hysteresis. This answers
 * "which quadrant is this point in", not "what would the product publish", and
 * conflating the two is what a phase plot is uniquely able to show apart.
 */
export const regimeAtCoordinates = (
  tightness: number,
  riskAppetite: number,
  thresholds: RegimeThresholds = DEFAULT_THRESHOLDS,
): RegimeKey => {
  const tight = tightness > thresholds.tightnessRegime;
  const risky = riskAppetite > thresholds.riskAppetiteRegime;
  if (tight) return risky ? "DEFENSIVE" : "SCARCITY";
  return risky ? "EXPANSION" : "VOLATILE";
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Record dates are UTC day stamps; formatting them in the viewer's zone slides
 *  a month-end reading into the previous month west of Greenwich. */
export const formatPhaseMonth = (recordDate: string) => {
  const parsed = new Date(`${recordDate}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? recordDate : monthFormatter.format(parsed);
};

const buildGap = (
  axis: PhaseAxis,
  label: string,
  value: number,
  boundary: number,
  point: { tightness: number; riskAppetite: number },
  thresholds: RegimeThresholds,
): PhaseGap => {
  const delta = value - boundary;
  /* Land the hypothetical clear of the line rather than on it: the rule reads
     `> boundary`, so a value set exactly to the boundary stays on the side it
     started and the answer would name the current regime. */
  const crossedValue = delta > 0 ? boundary : boundary + 1;
  const flipsTo =
    axis === "tightness"
      ? regimeAtCoordinates(crossedValue, point.riskAppetite, thresholds)
      : regimeAtCoordinates(point.tightness, crossedValue, thresholds);

  return {
    axis,
    label,
    delta,
    distance: Math.abs(delta),
    side: delta > 0 ? "above" : delta < 0 ? "below" : "on",
    flipsTo,
    flipsToLabel: REGIME_LABELS[flipsTo],
  };
};

const PHASE_AXIS_LABELS: Record<PhaseAxis, string> = {
  tightness: regimeSignalLabel.tightness,
  riskAppetite: regimeSignalLabel.riskAppetite,
};

/**
 * @param series Oldest first. Anything shorter than two months has no trace to
 *   draw and no change to mark, so callers get `null` and render nothing.
 * @param recentMonths How many trailing months earn their own marker. The rest
 *   become trace: nobody needs to inspect March 2014 individually, and 175
 *   hit targets would bury the ones that matter.
 */
export const buildRegimePhaseModel = (
  series: PhaseSeriesEntry[],
  {
    thresholds = DEFAULT_THRESHOLDS,
    recentMonths = 24,
  }: { thresholds?: RegimeThresholds; recentMonths?: number } = {},
): RegimePhaseModel | null => {
  if (series.length < 2) return null;

  const points: PhasePoint[] = series.map((entry, index) => ({
    recordDate: entry.recordDate,
    monthLabel: formatPhaseMonth(entry.recordDate),
    tightness: entry.tightness,
    riskAppetite: entry.riskAppetite,
    regime: entry.regime,
    regimeLabel: REGIME_LABELS[entry.regime],
    changed: index > 0 && series[index - 1]!.regime !== entry.regime,
    saturated: entry.tightness >= TIGHTNESS_SCORE_CEILING,
  }));

  const current = points[points.length - 1]!;

  const counts = points.reduce<Partial<Record<RegimeKey, number>>>((acc, point) => {
    acc[point.regime] = (acc[point.regime] ?? 0) + 1;
    return acc;
  }, {});

  /* Ties break towards the harsher regime rather than towards whichever key was
     declared first. Two regimes holding the same number of months is common in a
     short window, and an order that falls out of an object literal changes when
     someone reorders the literal. */
  const occupancy: PhaseOccupancy[] = REGIME_ORDER.map((regime) => ({
    regime,
    regimeLabel: REGIME_LABELS[regime],
    months: counts[regime] ?? 0,
    share: (counts[regime] ?? 0) / points.length,
  })).sort((a, b) => b.months - a.months || REGIME_ORDER.indexOf(a.regime) - REGIME_ORDER.indexOf(b.regime));

  return {
    points,
    current,
    recent: points.slice(-Math.max(recentMonths, 2)),
    changes: points.filter((point) => point.changed),
    thresholds: {
      tightness: thresholds.tightnessRegime,
      riskAppetite: thresholds.riskAppetiteRegime,
    },
    gaps: {
      tightness: buildGap(
        "tightness",
        PHASE_AXIS_LABELS.tightness,
        current.tightness,
        thresholds.tightnessRegime,
        current,
        thresholds,
      ),
      riskAppetite: buildGap(
        "riskAppetite",
        PHASE_AXIS_LABELS.riskAppetite,
        current.riskAppetite,
        thresholds.riskAppetiteRegime,
        current,
        thresholds,
      ),
    },
    occupancy,
    saturatedMonths: points.filter((point) => point.saturated).length,
  };
};

/**
 * Windows the plane can be read over, mirroring the zoom presets on the timeline
 * rail so the two controls do not teach different vocabularies for the same idea.
 *
 * Five years is the default rather than the whole record: the record opens with a
 * decade parked in one corner at the zero bound, which is true and worth seeing
 * once, but it compresses the cycle a reader came for into a fifth of the plane.
 */
export const PHASE_SPANS = [
  { key: "3y", label: "3Y", months: 36, description: "three years" },
  { key: "5y", label: "5Y", months: 60, description: "five years" },
  { key: "10y", label: "10Y", months: 120, description: "ten years" },
  { key: "max", label: "Max", months: Number.MAX_SAFE_INTEGER, description: "the whole record" },
] as const;

export type PhaseSpanKey = (typeof PHASE_SPANS)[number]["key"];

const DEFAULT_PHASE_SPAN: PhaseSpanKey = "5y";

/** Unknown or absent values fall back rather than throwing: this reads a query
 *  string, so anything at all can arrive here. */
export const resolvePhaseSpan = (raw: string | string[] | undefined) => {
  const key = Array.isArray(raw) ? raw[0] : raw;
  return (
    PHASE_SPANS.find((span) => span.key === key) ??
    PHASE_SPANS.find((span) => span.key === DEFAULT_PHASE_SPAN)!
  );
};

/**
 * One sentence per gap, whole-clause rather than concatenated so it survives
 * translation, and reused verbatim by the accessible description.
 */
export const describePhaseGap = (gap: PhaseGap) => {
  const points = `${gap.distance.toLocaleString("en-US")} ${gap.distance === 1 ? "point" : "points"}`;
  if (gap.side === "on") {
    return `${gap.label} is sitting on its boundary; any move decides between here and ${gap.flipsToLabel}.`;
  }
  return gap.side === "above"
    ? `${gap.label} is ${points} above its boundary. Falling back through it alone would read ${gap.flipsToLabel}.`
    : `${gap.label} is ${points} below its boundary. Rising through it alone would read ${gap.flipsToLabel}.`;
};
