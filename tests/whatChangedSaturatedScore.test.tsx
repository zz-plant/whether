import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatChangedSection } from "../app/components/home/WhatChangedSection";
import type { SignalChangeRow } from "../lib/report/home/homeSectionModel";

/*
 * A score pinned at the top of its scale cannot show a weekly move, and the
 * delta row used to vanish at the ceiling: 100/100, no direction, and the
 * reader left to infer from the ceiling tag that the silence meant "off the
 * top" rather than "flat".
 *
 * The signals moved out of the hero into their own section on 2026-09-22, so
 * this is asserted where the row is now drawn. The claim is unchanged.
 */
const row = (overrides: Partial<SignalChangeRow> = {}): SignalChangeRow => ({
  key: "tightness",
  label: "Funding pressure",
  value: 100,
  valueLabel: "100",
  previous: null,
  previousLabel: null,
  delta: 0,
  increaseIsPositive: false,
  lines: [{ kind: "callChange", value: 70 }],
  ...overrides,
});

const render = (rows: SignalChangeRow[]) =>
  renderToStaticMarkup(<WhatChangedSection rows={rows} lead="Neither score moved much this week." comparisonUnavailable={false} />);

describe("a score at the top of its scale", () => {
  it("says a clipped score cannot show a move, instead of showing nothing", () => {
    const html = render([row({ saturatedPressure: 148 })]);

    assert.match(html, /Off the top of the scale\. The score can’t rise further, so it can’t show a move\./);
    assert.match(html, /It would read 148/, "the raw pressure stays visible beside it");
    assert.doesNotMatch(html, /\bclipped\b|\bceiling\b|100-point/i, "said in the reader's terms, not the scoring code's");
  });

  it("stays silent when the score is simply flat and not clipped", () => {
    const html = render([row({ value: 64, valueLabel: "64", delta: 0 })]);

    assert.ok(!html.includes("Off the top of the scale"), "a flat week is not a clipped one");
  });

  it("stays silent when there is a move", () => {
    const html = render([row({ value: 64, valueLabel: "64", delta: 3, previous: 61, previousLabel: "61" })]);

    assert.ok(!html.includes("Off the top of the scale"));
  });
});
