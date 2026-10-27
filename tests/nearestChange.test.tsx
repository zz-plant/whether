import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionHero } from "../app/components/DecisionHero";
import { HomeSection } from "../app/components/home/HomeSection";
import { regimeAcrossLine, regimeAtCoordinates } from "../lib/regimePhaseSpace";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
import { formatMarginReading, formatNearestChange } from "../lib/report/reportFormatting";
import type { RegimeKey } from "../lib/types";

/*
 * A screenshot people open is one that leaves them a small, specific question. The
 * week's is how near the reading is to changing, and to what: "2 pts from Freezing"
 * (2026-10-27). "From its change line" left a reader asking what the line changes to.
 */
describe("the nearest change, by what it changes to", () => {
  const regimes: RegimeKey[] = ["EXPANSION", "VOLATILE", "DEFENSIVE", "SCARCITY"];
  const lines = { ...DEFAULT_THRESHOLDS, tightnessRegime: 70, riskAppetiteRegime: 50 };
  const at: Record<RegimeKey, [number, number]> = { EXPANSION: [40, 60], VOLATILE: [40, 40], DEFENSIVE: [80, 60], SCARCITY: [80, 40] };

  it("is what the quadrant rule gives one score across its line", () => {
    for (const regime of regimes) {
      const [tightness, riskAppetite] = at[regime];
      assert.equal(regimeAtCoordinates(tightness, riskAppetite, lines), regime);
      assert.equal(regimeAcrossLine(regime, "tightness"), regimeAtCoordinates(140 - tightness, riskAppetite, lines));
      assert.equal(regimeAcrossLine(regime, "riskAppetite"), regimeAtCoordinates(tightness, 100 - riskAppetite, lines));
    }
  });

  it("names the conditions across the line in the margin, and without a regime keeps the old wording", () => {
    assert.equal(formatMarginReading({ signal: "riskAppetite", points: 2 }, "DEFENSIVE"), "Risk appetite 2 pts from Freezing");
    assert.equal(formatMarginReading({ signal: "tightness", points: 0 }, "EXPANSION"), "Funding pressure at its line to Cloudy");
    assert.equal(formatMarginReading({ signal: "riskAppetite", points: 1 }), "Risk appetite 1 pt from its change line");
  });

  it("says it in four words for the running head, and nothing without a margin or a regime", () => {
    assert.equal(formatNearestChange({ signal: "riskAppetite", points: 2 }, "DEFENSIVE"), "2 pts from Freezing");
    assert.equal(formatNearestChange({ signal: "riskAppetite", points: 1 }, "SCARCITY"), "1 pt from Cloudy");
    assert.equal(formatNearestChange({ signal: "tightness", points: 0 }, "VOLATILE"), "At the line to Freezing");
    assert.equal(formatNearestChange(null, "DEFENSIVE"), null);
    assert.equal(formatNearestChange({ signal: "tightness", points: 3 }, "NEUTRAL"), null);
  });
});

describe("a brief frame worth opening", () => {
  it("draws the nearer score on the phone card, above the strip that states its margin", () => {
    const html = renderToStaticMarkup(
      <DecisionHero
        weeklyCall="Hold."
        regime="DEFENSIVE"
        phoneFigure={<p>the ladder</p>}
        trust={{
          recordDateLabel: "Oct 23, 2026",
          sourcesLive: true,
          sourcesLabel: "All sources live",
          confidenceLabel: "LOW",
          margin: { signal: "riskAppetite", points: 2 },
          couldChangeNextWeek: true,
          basis: { key: "record", value: "The record's inputs", warning: null },
        }}
      />,
    );
    assert.match(html, /<div class="md:hidden" data-hero-phone-figure="true"><p>the ladder<\/p><\/div>/);
    assert.ok(html.indexOf("data-hero-phone-figure") < html.indexOf("Risk appetite 2 pts from Freezing"), "the drawing, then the sentence");
  });

  it("leads a section with its answer, before its evidence", () => {
    const html = renderToStaticMarkup(
      <HomeSection id="record" heading="How unusual is this?" lead="This spell has run 2 month-ends so far.">
        <figure>band</figure>
      </HomeSection>,
    );
    assert.match(html, /How unusual is this\?<\/h2>[\s\S]*data-section-lead[^>]*>This spell has run 2 month-ends so far\.<\/p><figure>/);
  });
});
