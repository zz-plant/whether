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
