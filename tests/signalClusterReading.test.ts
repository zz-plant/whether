import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildSignalClusterReading, isSignalClusterSlug } from "../lib/report/signalClusterReading";
import { buildAssessmentFixture } from "./fixtures/reportFixtures";
import type { SignalReadingSource } from "../lib/report/signalClusterReading";

/*
 * The three cluster pages used to render the same site-wide call under different
 * headings. These assertions are the difference: each page's own number, its own
 * threshold, its own direction, and the caveat that only applies to it.
 */

type ScoreOverrides = Partial<ReturnType<typeof buildAssessmentFixture>["scores"]>;
type ThresholdOverrides = Partial<ReturnType<typeof buildAssessmentFixture>["thresholds"]>;

const buildReportData = ({
  scores = {},
  thresholds = {},
  changedSignals = [],
  anomalySignals = [],
  inputs = [],
}: {
  scores?: ScoreOverrides;
  thresholds?: ThresholdOverrides;
  changedSignals?: Array<{ key: "tightness" | "riskAppetite" | "curveSlope"; label: string; delta: number }>;
  anomalySignals?: Array<{ key: "tightness" | "riskAppetite" | "curveSlope"; label: string; delta: number; reason: string }>;
  inputs?: Array<{ id: "base-rate" | "two-year" | "ten-year" | "curve-slope"; label: string; value: number | null; unit: string }>;
} = {}): SignalReadingSource => {
  const assessment = buildAssessmentFixture();

  return {
    assessment: {
      scores: { ...assessment.scores, ...scores },
      thresholds: { ...assessment.thresholds, ...thresholds },
      inputs: inputs.map((input) => ({
        ...input,
        sourceLabel: "FRED",
        sourceUrl: "https://fred.stlouisfed.org",
        recordDate: "2026-06-17",
        fetchedAt: "2026-06-17T00:00:00.000Z",
      })),
    },
    reportDynamics: { changedSignals, anomalySignals },
  };
};

describe("signal cluster reading", () => {
  it("recognises only the three cluster slugs", () => {
    assert.ok(isSignalClusterSlug("capital-tightness-watch"));
    assert.ok(isSignalClusterSlug("risk-appetite-watch"));
    assert.ok(isSignalClusterSlug("yield-curve-flip-watch"));
    assert.ok(!isSignalClusterSlug("not-a-watch"));
  });

  it("gives each cluster its own measure, value and threshold", () => {
    const reportData = buildReportData({
      scores: { tightness: 32, riskAppetite: 52, curveSlope: 0.3 },
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    });

    const tightness = buildSignalClusterReading("capital-tightness-watch", reportData);
    const risk = buildSignalClusterReading("risk-appetite-watch", reportData);
    const curve = buildSignalClusterReading("yield-curve-flip-watch", reportData);

    assert.equal(tightness.measure, "Funding pressure");
    assert.equal(tightness.value, 32);
    assert.equal(risk.measure, "Risk appetite");
    assert.equal(risk.value, 52);
    assert.equal(curve.measure, "Recession warning gauge");
    assert.equal(curve.value, 0.3);

    // The whole point: three pages, three readings.
    assert.equal(new Set([tightness.implication, risk.implication, curve.implication]).size, 3);
  });

  /*
   * The regression this suite exists for. An earlier version described position
   * as "short of" whenever the reading had not crossed to the uncomfortable
   * side, which rendered "2 points short of the 50 regime threshold" beneath a
   * risk-appetite reading of 52 — a number two points above it.
   */
  it("states which side of the threshold the reading sits on, in both directions", () => {
    const above = buildSignalClusterReading(
      "risk-appetite-watch",
      buildReportData({ scores: { riskAppetite: 52 }, thresholds: { riskAppetiteRegime: 50 } }),
    );
    assert.match(above.distanceLabel, /2 points above the line at 50 that changes the call/);

    const below = buildSignalClusterReading(
      "risk-appetite-watch",
      buildReportData({ scores: { riskAppetite: 41 }, thresholds: { riskAppetiteRegime: 50 } }),
    );
    assert.match(below.distanceLabel, /9 points below the line at 50 that changes the call/);

    const exact = buildSignalClusterReading(
      "risk-appetite-watch",
      buildReportData({ scores: { riskAppetite: 50 }, thresholds: { riskAppetiteRegime: 50 } }),
    );
    assert.match(exact.distanceLabel, /Exactly at the line at 50 that changes the call/);
  });

  /*
   * A rising funding-pressure score and a rising risk-appetite score mean
   * opposite things, so the tone cannot be read off the sign.
   */
  it("colours a move by what it means, not by its sign", () => {
    const easingPressure = buildSignalClusterReading(
      "capital-tightness-watch",
      buildReportData({ changedSignals: [{ key: "tightness", label: "Funding pressure", delta: -8 }] }),
    );
    assert.equal(easingPressure.directionTone, "easing");
    assert.match(easingPressure.directionLabel, /-8 points since last week/);

    const fallingAppetite = buildSignalClusterReading(
      "risk-appetite-watch",
      buildReportData({ changedSignals: [{ key: "riskAppetite", label: "Risk appetite", delta: -7 }] }),
    );
    assert.equal(fallingAppetite.directionTone, "tightening");
  });

  /*
   * A signal missing from `changedSignals` may have been flat, may have had no
   * prior week, or may have moved so far it was diverted to `anomalySignals`.
   * The wording has to be true for all three — an earlier version claimed "No
   * prior week to compare against", which was false for two of them and
   * contradicted the saturation caveat in the same panel.
   */
  it("does not claim there was no prior week when the move was merely immaterial", () => {
    const reading = buildSignalClusterReading("capital-tightness-watch", buildReportData());

    assert.equal(reading.delta, null);
    assert.equal(reading.directionTone, "unchanged");
    assert.match(reading.directionLabel, /No material move/);
    assert.ok(!/prior week/i.test(reading.directionLabel));
  });

  /*
   * The largest moves on the page are exactly the ones `buildReportDynamics`
   * routes away from `changedSignals`, so reading only that list hid them.
   */
  it("reports a move that was diverted to anomalySignals", () => {
    const reading = buildSignalClusterReading(
      "capital-tightness-watch",
      buildReportData({
        anomalySignals: [
          { key: "tightness", label: "Funding pressure", delta: 31, reason: "Exceeded weekly sanity threshold." },
        ],
      }),
    );

    assert.equal(reading.delta, 31);
    assert.equal(reading.directionTone, "tightening");
    assert.match(reading.directionLabel, /\+31 points since last week/);
  });

  /*
   * `buildReportDynamics` computes the slope delta as `(current ?? 0) -
   * (previous ?? 0)`, so an unresolved leg yields a confident number measured
   * from zero. Quoting it under "the spread cannot be computed" would be two
   * contradictory claims about one week.
   */
  it("reports no move when the slope itself did not resolve", () => {
    const reading = buildSignalClusterReading(
      "yield-curve-flip-watch",
      buildReportData({
        scores: { curveSlope: null },
        changedSignals: [{ key: "curveSlope", label: "Curve slope", delta: -0.29 }],
      }),
    );

    assert.equal(reading.delta, null);
    assert.equal(reading.displayValue, null);
  });

  /*
   * `tightness` clips at 100 and its components over-subscribe the cap, so above
   * roughly a 4% base rate the number stops moving and the weekly delta reads
   * zero. Rendering "100, unchanged" without saying so would let a pinned
   * ceiling read as a calm week — the one way this panel could mislead.
   */
  it("discloses a saturated funding-pressure score", () => {
    const saturated = buildSignalClusterReading(
      "capital-tightness-watch",
      buildReportData({ scores: { tightness: 100, tightnessSaturated: true } }),
    );
    assert.match(saturated.caveat ?? "", /ceiling/);

    const unsaturated = buildSignalClusterReading(
      "capital-tightness-watch",
      buildReportData({ scores: { tightness: 32, tightnessSaturated: false } }),
    );
    assert.equal(unsaturated.caveat, null);
  });

  it("names the shared curve driver on the risk-appetite watch", () => {
    const reading = buildSignalClusterReading("risk-appetite-watch", buildReportData());

    assert.match(reading.caveat ?? "", /gauge also feeds funding pressure/);
    // The engine owns the slope-to-threshold mapping; the page must not restate it.
    assert.ok(!/0\.25/.test(reading.caveat ?? ""), "does not encode the slope value behind the threshold");
  });

  it("flags an inverted curve as the condition, not an approaching one", () => {
    const inverted = buildSignalClusterReading(
      "yield-curve-flip-watch",
      buildReportData({ scores: { curveSlope: -0.4 } }),
    );
    assert.match(inverted.caveat ?? "", /inverted/);
    assert.match(inverted.distanceLabel, /0\.4 percentage points below zero, where long-term rates drop below short-term rates/);

    const positive = buildSignalClusterReading(
      "yield-curve-flip-watch",
      buildReportData({ scores: { curveSlope: 0.6 } }),
    );
    assert.equal(positive.caveat, null);
    assert.match(positive.distanceLabel, /0\.6 percentage points above zero/);
  });

  /*
   * The slope is nullable whenever either leg fails to resolve. An empty state
   * has to say what is missing and what still holds, not render a dash.
   */
  it("explains a missing curve slope instead of showing a blank", () => {
    const reading = buildSignalClusterReading(
      "yield-curve-flip-watch",
      buildReportData({ scores: { curveSlope: null } }),
    );

    assert.equal(reading.value, null);
    assert.match(reading.unavailableReason ?? "", /did not resolve/);
    assert.match(reading.unavailableReason ?? "", /call below still stands/);
  });

  it("builds the reading from the inputs each signal actually uses", () => {
    const reportData = buildReportData({
      inputs: [
        { id: "base-rate", label: "Base rate", value: 3.7, unit: "%" },
        { id: "curve-slope", label: "Curve slope", value: 0.3, unit: "%" },
        { id: "two-year", label: "2-year", value: 4.2, unit: "%" },
        { id: "ten-year", label: "10-year", value: 4.5, unit: "%" },
      ],
    });

    const tightness = buildSignalClusterReading("capital-tightness-watch", reportData);
    assert.deepEqual(tightness.inputs.map((input) => input.label), ["Short-term borrowing rate", "Recession warning gauge"]);
    assert.equal(tightness.inputs[0]?.value, "3.7%");

    const curve = buildSignalClusterReading("yield-curve-flip-watch", reportData);
    assert.deepEqual(curve.inputs.map((input) => input.label), ["2-year rate", "10-year rate"]);
  });

  it("drops an input the week could not resolve rather than printing an empty value", () => {
    const reportData = buildReportData({
      inputs: [
        { id: "base-rate", label: "Base rate", value: 3.7, unit: "%" },
        { id: "curve-slope", label: "Curve slope", value: null, unit: "%" },
      ],
    });

    const reading = buildSignalClusterReading("capital-tightness-watch", reportData);
    assert.deepEqual(reading.inputs.map((input) => input.label), ["Short-term borrowing rate"]);
  });

  /*
   * The bug a screenshot caught and the rest of this suite did not.
   *
   * The panel interpolated `value` directly, and the curve slope is a
   * subtraction of two floats — so `4.5 - 4.21` rendered
   * "0.29000000000000004pp" as the headline figure on a page whose whole claim
   * is that its numbers can be acted on. Assertions on `value` and on
   * `distanceLabel` both passed throughout, because neither is what was shown.
   */
  it("formats the figure the panel displays, not the raw float behind it", () => {
    const reading = buildSignalClusterReading(
      "yield-curve-flip-watch",
      buildReportData({ scores: { curveSlope: 4.5 - 4.21 } }),
    );

    assert.equal(reading.displayValue, "0.3%");
    assert.ok(
      !/\d\.\d{3,}/.test(reading.displayValue ?? ""),
      `displayValue must be rounded for display, got ${reading.displayValue}`,
    );
  });

  it("has no figure to display when the series is missing", () => {
    const reading = buildSignalClusterReading(
      "yield-curve-flip-watch",
      buildReportData({ scores: { curveSlope: null } }),
    );

    assert.equal(reading.displayValue, null);
  });

  it("writes the figure as a percentage and every move on it in percentage points", () => {
    const reading = buildSignalClusterReading(
      "yield-curve-flip-watch",
      buildReportData({
        scores: { curveSlope: 0.3 },
        changedSignals: [{ key: "curveSlope", label: "Curve slope", delta: -0.18 }],
      }),
    );

    // One unit per quantity, and no desk shorthand: this page has no key for "pp" or "bp".
    assert.equal(reading.displayValue, "0.3%");
    assert.match(reading.distanceLabel, /0\.3 percentage points above/);
    assert.match(reading.directionLabel, /-0\.18 percentage points since last week/);
    for (const line of [reading.displayValue, reading.distanceLabel, reading.directionLabel]) {
      assert.ok(!/\b(pp|bp)\b/.test(line ?? ""), `desk shorthand in "${line}"`);
    }
  });
});
