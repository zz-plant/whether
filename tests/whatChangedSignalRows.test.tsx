import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import { compositeSignalScales } from "../lib/report/signalTranslations";
import type { SignalChangeRow } from "../lib/report/home/homeSectionModel";

/*
 * The four signals were drawn twice on the homepage — once as the hero's
 * "Why this call" cells and again beside the actions — and neither drawing
 * said what the score was judged against without the reader opening a
 * disclosure. They are one table now, and each row carries the three things
 * that make a score actionable: where it is, where it was, and where its
 * lines are.
 *
 * The plain-language layer travels with it: a composite score is the one
 * number on the page with no unit, so it keeps the scale direction and what
 * the score means at its level (docs/agents/lessons/tests-and-copy-rules.md, "Who the copy is written for").
 */
const rows: SignalChangeRow[] = [
  {
    key: "tightness",
    label: "Funding pressure",
    value: 64,
    valueLabel: "64",
    previous: 61,
    previousLabel: "61",
    delta: 3,
    increaseIsPositive: false,
    scaleLabel: "moderate",
    lines: [{ kind: "pause", value: 76 }, { kind: "callChange", value: 70 }],
  },
  {
    key: "curveSlope",
    label: "Recession warning gauge",
    value: 0.45,
    valueLabel: "0.45%",
    previous: 0.5,
    previousLabel: "0.50%",
    delta: -0.05,
    increaseIsPositive: true,
  },
];

describe("the changed-signals table", () => {
  const html = renderToStaticMarkup(
    <WhatChangedSection rows={rows} lead="The scores moved toward tighter money this week." comparisonUnavailable={false} />,
  );

  it("draws every signal once, in one table", () => {
    assert.equal((html.match(/data-signal=/g) ?? []).length, rows.length);
    assert.equal((html.match(/data-testid="what-changed-table"/g) ?? []).length, 1);
  });

  it("puts last week, this week and the lines on one row", () => {
    const row = html.slice(html.indexOf('data-signal="tightness"'), html.indexOf('data-signal="curveSlope"'));
    assert.match(row, /Funding pressure/);
    assert.match(row, /61/, "last week's reading");
    assert.match(row, /64/, "this week's");
    // The ladder's key names the line; its tick carries only the number.
    const text = row.replace(/<[^>]+>/g, "");
    assert.match(text, /Pause 76/, "and the line it is judged against");
  });

  it("keeps the scale direction on a composite score and not on a market input", () => {
    const tightnessRow = html.slice(html.indexOf('data-signal="tightness"'), html.indexOf('data-signal="curveSlope"'));
    const curveRow = html.slice(html.indexOf('data-signal="curveSlope"'));
    assert.ok(tightnessRow.includes(compositeSignalScales.tightness.directionLabel));
    assert.ok(!curveRow.includes(compositeSignalScales.tightness.directionLabel));
    assert.match(curveRow, /Feeds into both scores, so it(?:&#x27;|')s judged against their lines\./, "an input that feeds the scores says so");
  });

  it("explains its terms in the rows rather than sending a stranger to a glossary", () => {
    assert.ok(!html.includes('href="/glossary"'));
  });

  it("draws no delta at all when there was no comparison", () => {
    const degraded = renderToStaticMarkup(
      <WhatChangedSection rows={rows} lead="No previous week to compare the scores against." comparisonUnavailable />,
    );
    assert.match(degraded, /No previous week to compare/);
    // The from→to chip is the comparison; with none to make, the cell is a dash.
    // Scoped to the rows: the column header names the comparison either way.
    const body = degraded.slice(degraded.indexOf('data-signal="tightness"'));
    assert.doesNotMatch(body, /→/, "a missing comparison is not a flat one");
    assert.match(body, /—/);
  });
});


describe("month-end context beside weekly changes", () => {
  const points = [
    { label: "Jul 31, 2026", value: 44 },
    { label: "Aug 31, 2026", value: 51 },
    { label: "Sep 30, 2026", value: 61 },
  ];

  it("keeps score histories on the same stated scale and dates their observations", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection rows={[...rows, { ...rows[0], key: "riskAppetite", label: "Risk appetite", increaseIsPositive: true }]} comparisonUnavailable={false}
        history={{ tightness: points, riskAppetite: points }} historyCaveat="Earlier scores use fewer inputs." />,
    );
    assert.equal((html.match(/Month-end · 0–100/g) ?? []).length, 2);
    assert.match(html, /3 readings from Jul 31, 2026 to Sep 30, 2026, ranging 0–100/);
    assert.match(html, /Earlier scores use fewer inputs/);
  });

  it("does not fabricate a trace or a history caveat when observations are missing", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection rows={rows} comparisonUnavailable history={{ tightness: points.slice(0, 2) }}
        historyCaveat="Earlier scores use fewer inputs." />,
    );
    assert.doesNotMatch(html, /Month-end · 0–100|Earlier scores use fewer inputs/);
  });
});

describe("input history small multiples", () => {
  const series = [
    { key: "VIX_INDEX", label: "Volatility (VIX)", points: [
      { label: "Oct 8", value: 15.4 }, { label: "Oct 15", value: 16.5 }, { label: "Oct 22", value: 19.0 },
    ] },
    { key: "CPI_YOY", label: "Inflation (CPI)", points: [
      { label: "Aug 1", value: 3.35 }, { label: "Sep 1", value: 3.72 }, { label: "Oct 1", value: 3.9 },
    ] },
  ];

  it("draws one autoscaled sparkline per input with three or more readings", () => {
    const html = renderToStaticMarkup(
      <WhatChangedSection rows={rows} comparisonUnavailable inputHistory={series} />,
    );
    assert.equal((html.match(/data-testid="input-history-grid"/g) ?? []).length, 1);
    assert.match(html, /Volatility \(VIX\)/);
    assert.match(html, /Inflation \(CPI\)/);
    assert.equal((html.match(/trailing ~90 days/g) ?? []).length, 2);
  });

  it("renders nothing when every series is too short to draw", () => {
    const short = series.map((entry) => ({ ...entry, points: entry.points.slice(0, 2) }));
    const html = renderToStaticMarkup(
      <WhatChangedSection rows={rows} comparisonUnavailable inputHistory={short} />,
    );
    assert.doesNotMatch(html, /data-testid="input-history-grid"|trailing ~90 days/);
  });

  it("renders nothing when no input history is supplied", () => {
    const html = renderToStaticMarkup(<WhatChangedSection rows={rows} comparisonUnavailable />);
    assert.doesNotMatch(html, /data-testid="input-history-grid"|Inputs over the last/);
  });
});
