import type { RegimeAssessment } from "../regimeEngine";
import type { ReportData } from "./reportData";
import { isSignalsClusterSlug } from "../../app/signals/clusterRoutes";

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

export type SignalClusterSlug =
  | "capital-tightness-watch"
  | "risk-appetite-watch"
  | "yield-curve-flip-watch";

export type SignalReadingInput = { label: string; value: string };

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
  reportDynamics: Pick<ReportData["reportDynamics"], "changedSignals">;
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
  /** Rendered after the number: "of 100", "pp". */
  unit: string;
  /** How to read the scale, in words. */
  scaleNote: string;
  threshold: { value: number; label: string };
  /** Week-over-week move. Null when there is no prior reading to compare. */
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

const ONE_DECIMAL = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
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

const findDelta = (reportData: SignalReadingSource, key: "tightness" | "riskAppetite" | "curveSlope") =>
  reportData.reportDynamics.changedSignals.find((signal) => signal.key === key)?.delta ?? null;

const findInputValue = (reportData: SignalReadingSource, id: string) =>
  reportData.assessment.inputs.find((input) => input.id === id);

const formatInput = (reportData: SignalReadingSource, id: string, label: string): SignalReadingInput | null => {
  const input = findInputValue(reportData, id);
  if (!input || input.value === null) return null;
  return { label, value: `${ONE_DECIMAL.format(input.value)}${input.unit}` };
};

/**
 * Direction, in the reader's terms rather than the number's.
 *
 * A rising funding-pressure score and a rising risk-appetite score mean opposite
 * things, so the tone cannot be read off the sign alone.
 */
const describeDirection = (
  delta: number | null,
  betterWhen: "higher" | "lower",
  unitWord: string,
  formatter: Intl.NumberFormat,
): { label: string; tone: SignalClusterReading["directionTone"] } => {
  if (delta === null) {
    return { label: "No prior week to compare against.", tone: "unchanged" };
  }
  if (delta === 0) {
    return { label: `Unchanged from last week.`, tone: "unchanged" };
  }

  const moved = `${formatter.format(delta)}${unitWord}`;
  const towardComfort = betterWhen === "higher" ? delta > 0 : delta < 0;
  return {
    label: `${moved} since last week.`,
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
 * for both; the colour on the week-over-week row carries the judgement.
 *
 * `unit` carries its own leading space where one belongs ("\u00a0points" vs "pp"),
 * so the distance line joins the same way the headline figure does — the panel
 * renders "0.4pp" above and would otherwise say "0.4 pp" two lines below it.
 */
const describeDistance = (
  value: number | null,
  threshold: number,
  unit: string,
  thresholdLabel: string,
  formatter: Intl.NumberFormat = WHOLE,
): string => {
  if (value === null) return `Threshold: ${thresholdLabel}.`;

  const gap = Math.abs(value - threshold);
  if (gap === 0) return `Exactly at ${thresholdLabel}.`;

  return `${formatter.format(gap)}${unit} ${value > threshold ? "above" : "below"} ${thresholdLabel}.`;
};

export const buildSignalClusterReading = (
  cluster: SignalClusterSlug,
  reportData: SignalReadingSource,
): SignalClusterReading => {
  const { assessment } = reportData;
  const { scores, thresholds } = assessment;

  if (cluster === "capital-tightness-watch") {
    const delta = findDelta(reportData, "tightness");
    const direction = describeDirection(delta, "lower", " points", SIGNED_WHOLE);

    return {
      measure: "Funding pressure",
      value: scores.tightness,
      displayValue: WHOLE.format(scores.tightness),
      unit: "",
      scaleNote: "of 100",
      threshold: { value: thresholds.tightnessRegime, label: `the ${WHOLE.format(thresholds.tightnessRegime)} regime threshold` },
      delta,
      betterWhen: "lower",
      distanceLabel: describeDistance(
        scores.tightness,
        thresholds.tightnessRegime,
        " points",
        `the ${WHOLE.format(thresholds.tightnessRegime)} regime threshold`,
      ),
      directionLabel: direction.label,
      directionTone: direction.tone,
      inputs: [
        formatInput(reportData, "base-rate", "Base rate"),
        formatInput(reportData, "curve-slope", "Curve slope"),
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
        "Long-payback commitments are the exposure this measures: the higher it runs, the shorter the payback "
        + "window a new commitment should be underwritten against.",
      unavailableReason: null,
    };
  }

  if (cluster === "risk-appetite-watch") {
    const delta = findDelta(reportData, "riskAppetite");
    const direction = describeDirection(delta, "higher", " points", SIGNED_WHOLE);

    return {
      measure: "Risk appetite",
      value: scores.riskAppetite,
      displayValue: WHOLE.format(scores.riskAppetite),
      unit: "",
      scaleNote: "of 100",
      threshold: { value: thresholds.riskAppetiteRegime, label: `the ${WHOLE.format(thresholds.riskAppetiteRegime)} regime threshold` },
      delta,
      betterWhen: "higher",
      distanceLabel: describeDistance(
        scores.riskAppetite,
        thresholds.riskAppetiteRegime,
        " points",
        `the ${WHOLE.format(thresholds.riskAppetiteRegime)} regime threshold`,
      ),
      directionLabel: direction.label,
      directionTone: direction.tone,
      inputs: [
        formatInput(reportData, "curve-slope", "Curve slope"),
        formatInput(reportData, "two-year", "2-year"),
        formatInput(reportData, "ten-year", "10-year"),
      ].filter((input): input is SignalReadingInput => input !== null),
      /*
       * Deliberately states the shared driver without restating the threshold's
       * meaning in slope terms — `riskAppetiteRegime` documents that callers
       * should not encode that relationship, because the mapping is the engine's
       * to change.
       */
      caveat:
        "Risk appetite is derived from the curve, and the curve also feeds funding pressure. "
        + "A move in the curve shows up on both watches at once, so treat them as one reading rather than two confirmations.",
      implication:
        "This is the pacing input for growth and hiring exposure: the lower it runs, the more of a new commitment "
        + "should be reversible within the quarter.",
      unavailableReason: null,
    };
  }

  const delta = findDelta(reportData, "curveSlope");
  const direction = describeDirection(delta, "higher", "pp", SIGNED_TWO);
  const slope = scores.curveSlope;

  return {
    measure: "Curve slope",
    value: slope,
    displayValue: slope === null ? null : `${ONE_DECIMAL.format(slope)}pp`,
    unit: "pp",
    scaleNote: "10-year minus 2-year",
    threshold: { value: 0, label: "the zero line where the curve inverts" },
    delta,
    betterWhen: "higher",
    distanceLabel: describeDistance(slope, 0, "pp", "the zero line where the curve inverts", ONE_DECIMAL),
    directionLabel: direction.label,
    directionTone: direction.tone,
    inputs: [
      formatInput(reportData, "two-year", "2-year"),
      formatInput(reportData, "ten-year", "10-year"),
    ].filter((input): input is SignalReadingInput => input !== null),
    caveat: slope !== null && slope < 0
      ? "The curve is inverted. This is the condition the watch exists for, not a warning that one is approaching."
      : null,
    implication:
      "Irreversible bets are what this guards: the closer the slope runs to zero, the more a commitment should "
      + "carry an explicit way out before it is signed.",
    /* An empty state that says what is missing and what still holds, rather than
       a dash. The slope is nullable whenever either leg fails to resolve. */
    unavailableReason: slope === null
      ? "The 2-year or 10-year leg did not resolve this week, so the spread cannot be computed. "
        + "The bounded call below still stands on the rest of the rate stack."
      : null,
  };
};
