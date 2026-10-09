import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConditionsLegend } from "../app/components/home/ConditionsLegend";
import type { RegimeKey } from "../lib/regimeEngine";
import { regimeAtCoordinates } from "../lib/regimePhaseSpace";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";

/*
 * The one-line legend above the week (site review, 2026-10-09). It replaced a
 * standfirst and a folded "How to read this page" (three steps, the four conditions
 * with their meanings, two kinds of line, three links), which sat above the verdict.
 * The definition a first visit needs to decode the card is the four sides of the two
 * change lines, and it was printed in full only at the foot of /concepts and halfway
 * down /history.
 */

const THRESHOLDS = { tightnessRegime: 70, riskAppetiteRegime: 50 };

const text = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const render = (props: { currentRegime?: RegimeKey; arrival?: "share" } = {}) =>
  renderToStaticMarkup(<ConditionsLegend thresholds={THRESHOLDS} {...props} />);

describe("conditions legend", () => {
  it("defines the four conditions by the two change lines, mildest first, in one line", () => {
    const line = text(render());
    assert.match(
      line,
      /^Sunny: funding pressure below 70, risk appetite above 50 · Cloudy: above 70, above 50 · Stormy: below 70, below 50 · Freezing: above 70, below 50\. How they are set$/,
    );
    const html = render();
    assert.equal((html.match(/<p[\s>]/g) ?? []).length, 1, "one line, one paragraph");
    assert.doesNotMatch(html, /<details|<h[1-6]/, "nothing folded and no heading above the verdict");
    assert.match(html, /href="\/trust#formula-reference"/, "the method is one click away");
  });

  /* The sides must be the engine's: a reading that the legend calls Freezing is one
     the classifier calls Freezing. */
  it("agrees with the classifier on every side it names", () => {
    const thresholds = { ...DEFAULT_THRESHOLDS, ...THRESHOLDS };
    const cases: Array<[RegimeKey, number, number]> = [
      ["EXPANSION", 60, 60],
      ["DEFENSIVE", 80, 60],
      ["VOLATILE", 60, 40],
      ["SCARCITY", 80, 40],
    ];
    for (const [regime, tightness, riskAppetite] of cases) {
      assert.equal(regimeAtCoordinates(tightness, riskAppetite, thresholds), regime);
    }
  });

  it("marks this week's condition, and none on an archived week", () => {
    assert.match(text(render({ currentRegime: "SCARCITY" })), /Freezing: above 70, below 50 \(this week\)\./);
    assert.equal((text(render({ currentRegime: "SCARCITY" })).match(/\(this week\)/g) ?? []).length, 1);
    assert.doesNotMatch(text(render()), /this week/);
  });

  it("reads the change lines it is handed", () => {
    const html = renderToStaticMarkup(<ConditionsLegend thresholds={{ tightnessRegime: 72, riskAppetiteRegime: 48 }} />);
    assert.match(text(html), /funding pressure below 72, risk appetite above 48/);
  });

  it("tells a reader who followed a paste what they are looking at, in the same line", () => {
    const shared = text(render({ arrival: "share" }));
    assert.match(shared, /^This is this week's guidance from Whether\. Sunny:/);
    assert.doesNotMatch(text(render()), /This is this week/);
  });

  it("keeps the dismiss control and the attribute the layout hides it by", () => {
    const html = render();
    assert.match(html, /aria-label="Dismiss the conditions legend"/);
    assert.match(html, /data-weather-first-run-orientation="true"/);
  });
});
