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

const render = (props: { currentRegime?: RegimeKey; arrival?: "share"; orientation?: string } = {}) =>
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

  it("defines only this week's condition on a live week, and all four on an archived one", () => {
    // The four ran to four lines on a phone above the call (2026-10-14); a live
    // week defines its own and links to the rest.
    const live = text(render({ currentRegime: "SCARCITY" }));
    assert.match(live, /^Freezing this week: pricey money, wary investors \(funding pressure above 70, risk appetite below 50\)\. The four conditions and how they are set/);
    assert.doesNotMatch(live, /Sunny|Cloudy|Stormy/);
    assert.doesNotMatch(text(render()), /this week/);
    assert.match(text(render()), /Sunny:.*Cloudy:.*Stormy:.*Freezing:/);
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

  it("says whom the site is for before the conditions, at every width", () => {
    /* The card opens on the week's guidance, which never says what Whether is
       (2026-10-21). The orientation leads the line and, unlike the definitions,
       is not hidden from `md` up, where the conditions chart defines the four. */
    const orientation = "For startup leaders: the interest-rate and credit lines that pause or resume your hiring, spend and raise.";
    const html = render({ currentRegime: "DEFENSIVE", orientation });
    assert.match(text(html), /^For startup leaders: the interest-rate and credit lines .* Cloudy this week: pricey money, willing investors/);
    assert.doesNotMatch(html.match(/<section[^>]*>/)?.[0] ?? "", /md:hidden/, "the section shows from md up");
    assert.match(html, /<span class="md:hidden" data-conditions-definitions/, "the definitions still give way to the chart");
    assert.match(html, /aria-label="Dismiss this introduction"/);
    assert.match(render().match(/<section[^>]*>/)?.[0] ?? "", /md:hidden/, "without it, the legend stays phone-only");
  });

  it("keeps the dismiss control and the attribute the layout hides it by", () => {
    const html = render();
    assert.match(html, /aria-label="Dismiss the conditions legend"/);
    assert.match(html, /data-weather-first-run-orientation="true"/);
  });
});
