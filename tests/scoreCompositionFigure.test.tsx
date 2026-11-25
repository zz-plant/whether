import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, evaluateRegime } from "../lib/regimeEngine";
import { buildScoreComposition } from "../lib/report/scoreComposition";
import { resolveScoringBasis } from "../lib/report/scoringBasis";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import { FormulaReference } from "../app/trust/formulaReference";

/*
 * /trust draws this week's two scores as the points their inputs gave them,
 * open above the folded arithmetic (ui-ux-standards §XII), beside the sentence
 * that states the same sum. What a reader relies on: the sentence is printed,
 * the drawing sits outside the fold, every drawn part is a control with a name,
 * the readout opens on the biggest input with a link to its source, and the
 * inputs left out are drawn apart under the not-counted line /signals prints.
 */
const treasury: TreasuryData = {
  source: "https://fred.stlouisfed.org/series/DGS1MO",
  record_date: "2026-11-16",
  fetched_at: "2026-11-18T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 4.1, twoYear: 4.83, tenYear: 5.12 },
};

const macro = (id: MacroSeriesReading["id"], value: number, sourceUrl: string): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "index",
  explanation: "",
  sourceLabel: "FRED",
  sourceUrl,
  formulaUrl: "/trust#formula-reference",
  record_date: "2026-11-16",
  fetched_at: "2026-11-18T00:00:00Z",
  isLive: true,
});

const macroSeries = [
  macro("VIX_INDEX", 25.46, "https://fred.stlouisfed.org/series/VIXCLS"),
  macro("CHICAGO_FCI", -0.48, "https://fred.stlouisfed.org/series/NFCI"),
  macro("VC_FUNDING_VELOCITY", -32.8, "https://news.crunchbase.com/"),
  macro("TECH_LAYOFF_TREND", 66, "https://layoffs.fyi/"),
];

const render = () => {
  const assessment = evaluateRegime(treasury, DEFAULT_THRESHOLDS, macroSeries);
  const scoringBasis = resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment });
  const composition = buildScoreComposition({
    assessment,
    treasury,
    macroSeries,
    treasurySource: { label: "Federal Reserve Economic Data (FRED)", url: treasury.source },
    scoringBasis,
    evaluate: evaluateRegime,
  });
  assert.ok(composition, "the fixture rebuilds");
  return { composition, html: renderToStaticMarkup(<FormulaReference scoringBasis={scoringBasis} composition={composition} />) };
};

describe("the score composition on /trust", () => {
  it("prints each score's arithmetic, open above the folded method", () => {
    const { composition, html } = render();
    assert.ok(html.includes(composition.tightness.sentence.replace(/'/g, "&#x27;")), "the funding-pressure sentence is printed");
    assert.match(html, /Funding pressure 90 = 90 from the short-term borrowing rate/);
    assert.match(html, /Risk appetite 44 = 52 from the yield curve − 8 from stock-market volatility\./);
    assert.match(html, /Not counted: startup-market inputs, which would take it down 11 points\./, "the scoring basis's own line");
    assert.ok(
      html.indexOf("data-score-composition") < html.indexOf("Show the exact arithmetic"),
      "the drawing sits outside the arithmetic fold",
    );
    assert.match(html, /Each bar runs from 0 to 100\./, "the domain is stated");
  });

  it("makes every drawn part a named control and opens the readout on the biggest input", () => {
    const { html } = render();
    assert.match(html, /<legend class="sr-only">Inputs to funding pressure, on its 0 to 100 scale<\/legend>/);
    assert.match(html, /type="radio"[^>]*aria-label="Short-term borrowing rate, \+90 points"[^>]*checked=""/);
    assert.match(html, /aria-label="Stock-market volatility, −8 points"/);
    assert.match(html, /aria-label="Startup-market inputs, −11 points, not counted"/);
    assert.match(html, /Short-term borrowing rate<span[^>]*> · the biggest single input<\/span>/);
    assert.match(html, /href="https:\/\/fred\.stlouisfed\.org\/series\/DGS1MO"[^>]*>Federal Reserve Economic Data \(FRED\) →/);
    assert.match(html, /data-composition-part="startupMarket"/, "the left-out inputs are drawn, apart");
    assert.doesNotMatch(html, /data-composition-part="inversion"/, "a part worth nothing draws nothing");
  });

  it("renders nothing of the drawing when the scores cannot be rebuilt", () => {
    const html = renderToStaticMarkup(<FormulaReference composition={null} />);
    assert.doesNotMatch(html, /data-score-composition/);
    assert.match(html, /Show the exact arithmetic/);
  });
});
