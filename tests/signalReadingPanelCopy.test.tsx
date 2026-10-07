import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SignalReadingPanel } from "../app/signals/components/signalReadingPanel";
import { buildSignalClusterReading, type SignalReadingSource } from "../lib/report/signalClusterReading";

/*
 * /signals/[cluster] is a primary surface (docs/glossary-retirement-plan.md): most
 * readers arrive from a search result, and nothing on the page expands desk
 * shorthand. So the panel is judged on what it renders — the curve page used to
 * print "0.3pp", "Curve slope" and "the zero line where the curve inverts".
 */

const source = (overrides: Partial<SignalReadingSource["assessment"]["scores"]> = {}): SignalReadingSource => ({
  assessment: {
    scores: {
      tightness: 72,
      riskAppetite: 41,
      curveSlope: -0.3,
      baseRate: 4.3,
      baseRateUsed: "1M",
      tightnessSaturated: false,
      ...overrides,
    } as SignalReadingSource["assessment"]["scores"],
    thresholds: { baseRateTightness: 3.5, tightnessRegime: 70, riskAppetiteRegime: 50 },
    inputs: [
      { id: "base-rate", label: "Base rate", value: 4.3, unit: "%" },
      { id: "curve-slope", label: "Curve slope", value: -0.3, unit: "%" },
      { id: "two-year", label: "2-year", value: 4.6, unit: "%" },
      { id: "ten-year", label: "10-year", value: 4.3, unit: "%" },
    ] as SignalReadingSource["assessment"]["inputs"],
  },
  reportDynamics: {
    changedSignals: [{ key: "curveSlope", label: "Curve slope", delta: -0.12 }],
    anomalySignals: [],
  } as unknown as SignalReadingSource["reportDynamics"],
});

const render = (cluster: Parameters<typeof buildSignalClusterReading>[0]) =>
  renderToStaticMarkup(
    <SignalReadingPanel reading={buildSignalClusterReading(cluster, source())} recordDateLabel="Sep 18, 2026" />,
  ).replace(/<[^>]+>/g, " ");

describe("signal watch pages say what they measure in plain words", () => {
  for (const cluster of ["capital-tightness-watch", "risk-appetite-watch", "yield-curve-flip-watch"] as const) {
    it(`renders ${cluster} without desk shorthand or engine names`, () => {
      const text = render(cluster);
      assert.doesNotMatch(text, /\b(pp|bp)\b|Curve slope|Base rate|10Y|2Y|tightness|the curve inverts/);
    });
  }

  /*
   * The comparison is the last month-end snapshot, and the panel headed the
   * line "Week over week" over "+27 points since Aug 31." on Oct 5 — five weeks.
   * The line names its basis; the heading no longer names a different one.
   */
  it("heads the move without calling the comparison a week", () => {
    const dated: SignalReadingSource = {
      ...source(),
      reportDynamics: {
        changedSignals: [{ key: "tightness", label: "Funding pressure", delta: 27 }],
        anomalySignals: [],
        comparedWith: { recordDate: "2026-08-31", label: "Aug 31" },
      } as unknown as SignalReadingSource["reportDynamics"],
    };
    const text = renderToStaticMarkup(
      <SignalReadingPanel reading={buildSignalClusterReading("capital-tightness-watch", dated)} recordDateLabel="Oct 5, 2026" />,
    )
      .replace(/<!-- -->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    assert.doesNotMatch(text, /week over week/i);
    assert.match(text, /Movement \+27 points since Aug 31\./);
  });

  it("states the curve reading as a percentage and its moves in percentage points", () => {
    const text = render("yield-curve-flip-watch");
    assert.match(text, /-0\.3%/);
    assert.match(text, /percentage points below zero, where long-term rates drop below short-term rates/);
    assert.match(text, /-0\.12 percentage points since last week/);
    assert.match(text, /Long-term rates are below short-term rates now/);
  });
});
