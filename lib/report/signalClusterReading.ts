import type { RegimeAssessment } from "../regimeEngine";
import type { ReportData } from "./reportData";
import { isSignalsClusterSlug } from "../../app/signals/clusterRoutes";
import { comparisonBasis, type ComparisonBasis } from "./comparisonBasis";
import { regimeSignalLabel } from "./signalTranslations";

/**
 * What a signal cluster page is actually about.
 *
 * `/signals/capital-tightness-watch`, `/signals/risk-appetite-watch` and
 * `/signals/yield-curve-flip-watch` rendered a heading, one sentence, and the
 * site-wide bounded call — the same call, on all three. So a page named after
 * funding pressure showed no reading of funding pressure, while quoting its
 * value in passing inside the shared call block. Three URLs, one page.
 *
 * This derives the reading each page is named for: the number, where it sits
 * against the threshold that governs it, which way it moved, the raw inputs
 * behind it, and the caveat that applies to that particular signal. Kept out of
 * the component so the arithmetic and the honesty rules below are testable
 * without rendering.
 */

type SignalClusterSlug =
  | "capital-tightness-watch"
  | "risk-appetite-watch"
  | "yield-curve-flip-watch";

type SignalReadingInput = { label: string; value: string };

/**
 * Only what the reading needs.
 *
 * Narrower than `ReportData` on purpose: this reads four fields, and demanding
 * the whole object would force every caller — a test most of all — to construct
 * or cast a hundred-field structure to exercise a subtraction. `ReportData`
 * satisfies it structurally, so the routes pass theirs unchanged.
 */
export type SignalReadingSource = {
  assessment: Pick<RegimeAssessment, "scores" | "thresholds" | "inputs">;
  reportDynamics: Pick<ReportData["reportDynamics"], "changedSignals" | "anomalySignals" | "comparedWith">;
};

export type SignalClusterReading = {
  /** The signal's own name, not the page title. */
  measure: string;
  /** Null when the underlying series did not resolve this week. */
  value: number | null;
  /**
   * The figure as it should be shown, unit included.
   *
   * Separate from `value` because the panel must never interpolate the raw
   * number: the curve slope is a subtraction of two floats, so `10Y - 2Y` puts
   * `0.29000000000000004pp` on screen — on a page whose entire claim is that its
   * numbers can be acted on. `value` stays numeric for comparisons and tests.
   */
  displayValue: string | null;
  /** The figure's unit, after the number where a surface prints one (the share card): "", "percentage points". */
  unit: string;
  /** How to read the scale, in words. */
  scaleNote: string;
  threshold: { value: number; label: string };
  /** The move since the comparison reading (last week's brief or the last month-end snapshot, named in `directionLabel`). Null when there is no prior reading to compare. */
  delta: number | null;
  /** Which direction is the comfortable one, for colouring the move. */
  betterWhen: "higher" | "lower";
  distanceLabel: string;
  directionLabel: string;
  /** Tone for the direction row. `unchanged` also covers a saturated flat read. */
  directionTone: "easing" | "tightening" | "unchanged";
  inputs: SignalReadingInput[];
  /** Present only when this signal has something the number alone would hide. */
  caveat: string | null;
  /** One bounded sentence: what this reading changes for the reader. */
  implication: string;
  unavailableReason: string | null;
};

/* Two places, as rates are quoted. The gauge and its inputs were one ("0.5"), beside
   a two-place move ("+0.06") on the same panel. */
const TWO_PLACES = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
/** The recession warning gauge's unit: a gap between two rates, in percentage points. */
const GAUGE_UNIT = " percentage points";
const WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const SIGNED_WHOLE = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});
const SIGNED_TWO = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

export const isSignalClusterSlug = (value: string): value is SignalClusterSlug =>
  isSignalsClusterSlug(value)
  && (value === "capital-tightness-watch"
    || value === "risk-appetite-watch"
    || value === "yield-curve-flip-watch");

/**
 * The week's move, from both places it can be recorded.
 *
 * `buildReportDynamics` drops any signal whose |delta| is under 0.01 and diverts
 * anything past its sanity threshold into `anomalySignals` — so a signal absent
 * from `changedSignals` may have been flat, may have moved more than any other
 * signal on the page, or may have had no prior week at all. Reading only
 * `changedSignals` collapsed all three into one claim, and the claim it made
 * ("No prior week to compare against") is false for two of them. The largest
 * moves were the ones being hidden.
 */
const findDelta = (reportData: SignalReadingSource, key: "tightness" | "riskAppetite" | "curveSlope") =>
  reportData.reportDynamics.changedSignals.find((signal) => signal.key === key)?.delta
  ?? reportData.reportDynamics.anomalySignals.find((signal) => signal.key === key)?.delta
  ?? null;

/** What the move is measured against, named by its date where the week records one. */
const basisOf = (reportData: SignalReadingSource) => comparisonBasis(reportData.reportDynamics.comparedWith);

const findInputValue = (reportData: SignalReadingSource, id: string) =>
  reportData.assessment.inputs.find((input) => input.id === id);

/**
 * A "Built from" input, at the two places a rate is quoted and the /signals rows
 * print. It was one place in "%" for all four, so the capital page read
 * "Recession warning gauge 0.5%" where /signals read 0.47pp, and the curve page
 * built a 0.47 gauge from "2-year rate 4.8% · 10-year rate 5.3%", which subtract
 * to 0.5. The gauge is a gap between two rates, so it is in percentage points,
 * written out: this page has no key for "pp" (`curveTermsKey.tsx` is on /signals).
 */
const formatInput = (reportData: SignalReadingSource, id: string, label: string): SignalReadingInput | null => {
  const input = findInputValue(reportData, id);
  if (!input || input.value === null) return null;
  if (id === "curve-slope") return { label, value: `${TWO_PLACES.format(input.value)}${GAUGE_UNIT}` };
  return { label, value: `${TWO_PLACES.format(input.value)}${input.unit}` };
};

/**
 * Direction, in the reader's terms rather than the number's.
 *
 * A rising funding-pressure score and a rising risk-appetite score mean opposite
 * things, so the tone cannot be read off the sign alone. Exported because the
 * evidence page's changed-signals table says the same thing about the same
 * move, and one sentence for it is the point (`lib/report/evidenceReaderModel.ts`).
 */
export const describeSignalDirection = (
  delta: number | null,
  betterWhen: "higher" | "lower",
  unitWord: string,
  formatter: Intl.NumberFormat,
  basis: ComparisonBasis = comparisonBasis(),
): { label: string; tone: SignalClusterReading["directionTone"] } => {
  if (delta === null) {
    /*
     * True for every case that lands here — no prior week, a move under the
     * 0.01 floor, or a signal the week did not resolve — where "no prior week"
     * was true for only one of them. It also has to not contradict the
     * saturation caveat, which says in the same panel that the weekly move
     * reads as zero.
     */
    return { label: "No material move recorded this week.", tone: "unchanged" };
  }
  if (delta === 0) {
    /* "Unchanged from last week." where the week is undated, and the date
       where it is: the comparison is last week's brief or the previous month-end. */
    return { label: basis.date ? `Unchanged ${basis.since}.` : `Unchanged from last week.`, tone: "unchanged" };
  }

  const moved = `${formatter.format(delta)}${unitWord}`;
  const towardComfort = betterWhen === "higher" ? delta > 0 : delta < 0;
  return {
    label: `${moved} ${basis.since}.`,
    tone: towardComfort ? "easing" : "tightening",
  };
};

/**
 * Position, stated as position.
 *
 * An earlier version said "short of" whenever the reading had not crossed to the
 * uncomfortable side, which put "2 points short of the 50 regime threshold" under
 * a risk-appetite reading of 52 — a number two points *above* it. "Short of"
 * carries a judgement ("not yet reached") that only holds for one of the two
 * directions, and reads as plainly false for the other. Above and below are true
 * for both; the colour on the movement row carries the judgement.
 *
 * `unit` carries its own leading space (" points", " percentage points"), so the
 * distance line reads as prose while the headline figure above it stays compact.
 */
const describeDistance = (
  value: number | null,
  threshold: number,
  unit: string,
  thresholdLabel: string,
  formatter: Intl.NumberFormat = WHOLE,
): string => {
  if (value === null) return `Change line: ${thresholdLabel}.`;

  const gap = Math.abs(value - threshold);
  if (gap === 0) return `Exactly at ${thresholdLabel}.`;

  const amount = formatter.format(gap);
  /* "1 points below the line" on the risk-appetite watch page (site review, 2026-10-09). */
  const units = amount === "1" && unit === " points" ? " point" : unit;
  return `${amount}${units} ${value > threshold ? "above" : "below"} ${thresholdLabel}.`;
};

/** Zero is the line itself, so it is named for what crossing it means, in the noun phrase rather than a ", where" aside after it. */
const ZERO_LINE_LABEL = "the zero level where long-term rates drop below short-term rates";

export const buildSignalClusterReading = (
  cluster: SignalClusterSlug,
  reportData: SignalReadingSource,
): SignalClusterReading => {
  const { assessment } = reportData;
  const { scores, thresholds } = assessment;

  if (cluster === "capital-tightness-watch") {
    const delta = findDelta(reportData, "tightness");
    const direction = describeSignalDirection(delta, "lower", " points", SIGNED_WHOLE, basisOf(reportData));

    return {
      measure: regimeSignalLabel.tightness,
      value: scores.tightness,
      displayValue: WHOLE.format(scores.tightness),
      unit: "",
      scaleNote: "of 100",
      threshold: { value: thresholds.tightnessRegime, label: `the line at ${WHOLE.format(thresholds.tightnessRegime)} where conditions change` },
      delta,
      betterWhen: "lower",
      distanceLabel: describeDistance(
        scores.tightness,
        thresholds.tightnessRegime,
        " points",
        `the line at ${WHOLE.format(thresholds.tightnessRegime)} where conditions change`,
      ),
      directionLabel: direction.label,
      directionTone: direction.tone,
      inputs: [
        formatInput(reportData, "base-rate", "Short-term borrowing rate"),
        formatInput(reportData, "curve-slope", "Recession warning gauge"),
      ].filter((input): input is SignalReadingInput => input !== null),
      /*
       * The score is clipped at 100 by design and its components over-subscribe
       * the cap, so above roughly a 4% base rate the published number stops
       * moving and its week-over-week delta reads zero. Showing "100, unchanged"
       * without saying so is the one way this panel could actively mislead —
       * a reader would take a pinned ceiling for a calm week.
       */
      caveat: scores.tightnessSaturated
        ? "This score is at its ceiling, so the weekly move reads as zero even when pressure is still building. "
          + "Read it as \"at or above the top of the scale\" rather than as a flat week."
        : null,
      implication:
        "The higher it runs, the sooner a new commitment has to pay back.",
      unavailableReason: null,
    };
  }

  if (cluster === "risk-appetite-watch") {
    const delta = findDelta(reportData, "riskAppetite");
    const direction = describeSignalDirection(delta, "higher", " points", SIGNED_WHOLE, basisOf(reportData));

    return {
      measure: regimeSignalLabel.riskAppetite,
      value: scores.riskAppetite,
      displayValue: WHOLE.format(scores.riskAppetite),
      unit: "",
      scaleNote: "of 100",
      threshold: { value: thresholds.riskAppetiteRegime, label: `the line at ${WHOLE.format(thresholds.riskAppetiteRegime)} where conditions change` },
      delta,
      betterWhen: "higher",
      distanceLabel: describeDistance(
        scores.riskAppetite,
        thresholds.riskAppetiteRegime,
        " points",
        `the line at ${WHOLE.format(thresholds.riskAppetiteRegime)} where conditions change`,
      ),
      directionLabel: direction.label,
      directionTone: direction.tone,
      inputs: [
        formatInput(reportData, "curve-slope", "Recession warning gauge"),
        formatInput(reportData, "two-year", "2-year rate"),
        formatInput(reportData, "ten-year", "10-year rate"),
      ].filter((input): input is SignalReadingInput => input !== null),
      /*
       * Deliberately states the shared driver without restating the threshold's
       * meaning in slope terms — `riskAppetiteRegime` documents that callers
       * should not encode that relationship, because the mapping is the engine's
       * to change.
       */
      caveat:
        "Risk appetite is derived from the recession warning gauge, and the gauge also feeds funding pressure. "
        + "A move in the gauge shows up on both watches at once, so treat them as one reading rather than two confirmations.",
      implication:
        "The lower it runs, the more of any new hire or growth spend should be reversible within the quarter.",
      unavailableReason: null,
    };
  }

  const slope = scores.curveSlope;
  /*
   * No slope, no move. `buildReportDynamics` computes this delta as
   * `(current ?? 0) - (previous ?? 0)`, so an unresolved leg produces a
   * confident-looking number measured from zero — and the panel would quote
   * "-0.29 percentage points since last week" directly beneath a line saying the spread cannot
   * be computed.
   */
  const delta = slope === null ? null : findDelta(reportData, "curveSlope");
  /*
   * One unit for the gauge, its distance and its move: percentage points, at two
   * places, written out. "pp" and "bp" are desk shorthand; this page has no key to
   * expand them (the charts on /signals do).
   *
   * The figure was "0.5%" at one place, the distance "0.5 percentage points above
   * zero", and the move beside them "+0.06 percentage points": a reading rounded
   * coarser than its own weekly change, in a unit (%) the /signals row for the same
   * gauge does not use (0.47pp). The share card printed `${displayValue} ${unit}`,
   * so it read "0.5% %".
   */
  const direction = describeSignalDirection(delta, "higher", GAUGE_UNIT, SIGNED_TWO, basisOf(reportData));

  return {
    measure: "Recession warning gauge",
    value: slope,
    displayValue: slope === null ? null : TWO_PLACES.format(slope),
    unit: GAUGE_UNIT.trim(),
    scaleNote: `${GAUGE_UNIT.trim()}: the 10-year rate minus the 2-year rate`,
    threshold: { value: 0, label: ZERO_LINE_LABEL },
    delta,
    betterWhen: "higher",
    distanceLabel: describeDistance(slope, 0, GAUGE_UNIT, ZERO_LINE_LABEL, TWO_PLACES),
    directionLabel: direction.label,
    directionTone: direction.tone,
    inputs: [
      formatInput(reportData, "two-year", "2-year rate"),
      formatInput(reportData, "ten-year", "10-year rate"),
    ].filter((input): input is SignalReadingInput => input !== null),
    caveat: slope !== null && slope < 0
      ? "Long-term rates are below short-term rates now (an inverted curve). This is the condition the watch exists for, not a warning that one is approaching."
      : null,
    implication:
      "The closer this runs to zero, the more a new commitment needs a written way out before it is signed.",
    /* An empty state that says what is missing and what still holds, rather than
       a dash. The slope is nullable whenever either leg fails to resolve. */
    unavailableReason: slope === null
      ? "The 2-year or 10-year rate did not resolve this week, so the gap between them cannot be computed. "
        + "The guidance below still stands on the other rates."
      : null,
  };
};
