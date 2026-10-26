import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { buildSegmentedLineSeries } from "../app/signals/components/segmentedLineSeries";
import {
  Sparkline,
  buildSparklinePath,
  interquartileRange,
  rangeLabel,
  sparklineDomain,
} from "../app/components/ui/sparkline";
import { HistoricalTrendChart } from "../app/components/historicalTrendChart";

/**
 * These guard the property that made a homepage chart wrong for months: geometry
 * has to come from the data. A chart whose shape is a function of array index,
 * or whose axis is stated nowhere, draws a claim nobody put in it.
 */
describe("segmented line series", () => {
  it("breaks the stroke at a gap instead of interpolating across it", () => {
    const series = buildSegmentedLineSeries({
      values: [1, 2, null, 4, 5],
      width: 100,
      height: 40,
      min: 0,
      max: 5,
    });

    assert.equal(series.paths.length, 2, "a hole splits the line into two runs");
    assert.equal(series.missingColumns.length, 1, "the hole is reported so it can be shaded");
  });

  it("never reports a lastPoint that was not drawn", () => {
    // The trailing 9 is a run of one, which is too short to render. A label
    // anchored to it would point at blank canvas.
    const series = buildSegmentedLineSeries({
      values: [1, 2, 3, null, 9],
      width: 100,
      height: 40,
      min: 0,
      max: 10,
    });

    assert.equal(series.paths.length, 1);
    assert.equal(series.lastPoint?.value, 3, "lastPoint comes from a rendered run");
  });

  it("maps equal values to equal heights regardless of position", () => {
    const series = buildSegmentedLineSeries({
      values: [5, 1, 5],
      width: 100,
      height: 40,
      min: 0,
      max: 10,
    });
    const ys = series.paths[0].split(/[ML]/).filter(Boolean).map((pair) => Number(pair.trim().split(" ")[1]));

    assert.equal(ys[0], ys[2], "first and last share a value, so they share a height");
    assert.ok(ys[1] > ys[0], "the smaller value sits lower on the canvas");
  });

  it("generates smooth monotonic spline paths with d3-shape", () => {
    const series = buildSegmentedLineSeries({
      values: [1, 5, 2, 8, 4],
      width: 100,
      height: 40,
      min: 0,
      max: 10,
      curve: "monotone",
    });

    assert.equal(series.paths.length, 1);
    const firstPath = series.paths[0] ?? "";
    assert.match(firstPath, /^M/, "starts with M");
    assert.match(firstPath, /C/, "contains cubic bezier curves from d3-shape");
  });

  it("generates closed area paths when baselineY is provided", () => {
    const series = buildSegmentedLineSeries({
      values: [1, 5, 2, 8, 4],
      width: 100,
      height: 40,
      min: 0,
      max: 10,
      curve: "monotone",
      baselineY: 20,
    });

    assert.equal(series.areaPaths.length, 1);
    const firstArea = series.areaPaths[0] ?? "";
    assert.match(firstArea, /^M/, "starts with M");
    assert.match(firstArea, /Z$/, "closed path ending with Z");
  });
});

describe("sparkline", () => {
  const points = [
    { label: "Jan", value: 40 },
    { label: "Feb", value: 60 },
    { label: "Mar", value: 50 },
    { label: "Apr", value: 70 },
  ];

  it("derives geometry from values, not from index", () => {
    const flat = buildSparklinePath([5, 5, 5, 5], [0, 10]);
    const ys = flat.split(/[ML]/).filter(Boolean).map((pair) => Number(pair.split(",")[1]));

    assert.ok(ys.every((y) => y === ys[0]), "a flat series draws a flat line, not a ramp");
  });

  it("states the domain in the accessible label so the shape can be decoded", () => {
    const html = renderToStaticMarkup(<Sparkline points={points} label="Boldness budget" />);

    assert.match(html, /aria-label="[^"]*ranging 40–70/);
    assert.match(html, /aria-label="[^"]*Latest 70 at Apr/);
    // The graphic is the <svg> itself, named in place. A role="img" on top of
    // it only repeats what the element already reports.
    assert.match(html, /<svg[^>]*aria-label="/);
  });

  it("renders nothing rather than a decorative stub when there is no shape", () => {
    assert.equal(renderToStaticMarkup(<Sparkline points={[]} label="Empty" />), "");
    assert.equal(
      renderToStaticMarkup(<Sparkline points={[{ label: "Jan", value: 1 }]} label="One" />),
      "",
    );
    // Two points is a segment whose slope is the delta printed beside it. The
    // change report drew one per composite signal, threshold-to-reading, and
    // it read as a trend next to a rail that already drew the comparison.
    assert.equal(
      renderToStaticMarkup(
        <Sparkline points={[{ label: "threshold", value: 70 }, { label: "now", value: 83 }]} label="Two" />,
      ),
      "",
    );
  });

  it("uses tokens for color so both themes resolve", () => {
    const html = renderToStaticMarkup(<Sparkline points={points} label="Boldness budget" tone="easing" />);

    assert.match(html, /var\(--color-semantic-easing-border\)/);
    assert.ok(!/#[0-9a-f]{6}|rgba?\(/i.test(html), "no hardcoded colors");
  });

  it("pads a flat domain instead of dividing by zero", () => {
    assert.deepEqual(sparklineDomain([7, 7, 7]), [6, 8]);
    assert.equal(rangeLabel([40.2, 70.8]), "40–71");
  });

  it("reports the middle 50% as the reference band", () => {
    const band = interquartileRange([10, 20, 30, 40, 50]);

    assert.deepEqual(band, [20, 40]);
    assert.equal(interquartileRange([1, 2]), undefined, "too few points for a quartile");
  });
});

describe("HistoricalTrendChart", () => {
  const points = [
    { date: "2026-01-01", value: 40 },
    { date: "2026-02-01", value: 60 },
    { date: "2026-03-01", value: 55 },
  ];

  it("renders nothing for a series too short to have shape", () => {
    assert.equal(
      renderToStaticMarkup(<HistoricalTrendChart label="Tightness" color="red" points={[points[0]]} />),
      "",
    );
  });

  it("states the autoscaled range in the SVG's own accessible label", () => {
    const html = renderToStaticMarkup(<HistoricalTrendChart label="Tightness" color="red" points={points} />);

    // The label sits on the <svg> itself, not on a wrapper. (`role="img"` is what
    // the audit asked for; the repo lints it away as prefer-tag-over-role.)
    assert.match(html, /<svg[^>]*aria-label="[^"]*ranging 40–60/);
    assert.match(html, /aria-label="[^"]*Latest [^"]*55/);
  });

  /*
   * /history printed "Risk appetite fell 6 over 12 months to 56" under a chart of
   * twelve month-ends, Sep 2025 to Aug 2026: the move from the first point to
   * the last spans eleven months, and the change over twelve was -10.
   */
  it("names the span its move covers, which is one fewer step than its points", () => {
    const html = renderToStaticMarkup(
      <HistoricalTrendChart label="Risk appetite" color="green" points={points} increaseIsPositive periodLabel="months" />,
    );
    const text = html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    assert.match(text, /Risk appetite rose 15 over 2 months to 55\./);
    assert.match(text, /2 months to Mar 2026/);
    assert.match(html, /aria-label="Risk appetite over 2 months,/);
    assert.doesNotMatch(text, /3 months/, "the point count is not the span");
  });

  it("draws on the score's 0–100 scale with its change line when given one", () => {
    const html = renderToStaticMarkup(
      <HistoricalTrendChart label="Funding pressure" color="red" points={points} periodLabel="months" changeLine={70} />,
    );
    assert.match(html, /data-change-line/);
    assert.match(html, /aria-label="Funding pressure over 2 months, on its 0–100 scale with the change line at 70\./);
    assert.doesNotMatch(html, /ranging 40–60/, "a fixed scale states the scale, not the data's range");
    const plain = renderToStaticMarkup(<HistoricalTrendChart label="Tightness" color="red" points={points} />);
    assert.doesNotMatch(plain, /data-change-line/, "no line without one");
  });

  it("shares its projection with the inline sparkline instead of a second implementation", () => {
    const values = points.map((p) => p.value);
    const domain = sparklineDomain(values);
    const sharedPath = buildSparklinePath(values, domain, 100, 32, 2);

    const html = renderToStaticMarkup(<HistoricalTrendChart label="Tightness" color="red" points={points} />);

    assert.ok(html.includes(sharedPath.split(" ")[0]), "the chart's path starts where the shared projection does");
  });

  it("flips favorable/unfavorable tone with increaseIsPositive rather than hardcoding direction", () => {
    const rising = [points[0], { date: "2026-02-01", value: 80 }];

    const tightnessStyle = renderToStaticMarkup(
      <HistoricalTrendChart label="Tightness" color="red" points={rising} />,
    );
    const appetiteStyle = renderToStaticMarkup(
      <HistoricalTrendChart label="Risk appetite" color="green" points={rising} increaseIsPositive />,
    );

    // A rise is unfavorable by default (tightness-style) and favorable when
    // increaseIsPositive is set (appetite-style) — the two must not render
    // the same tone class for the same data.
    assert.notEqual(tightnessStyle, appetiteStyle);
  });
});
