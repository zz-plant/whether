import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as nextNavigation from "next/navigation";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, evaluateRegime } from "../lib/regimeEngine";
import { buildScoreComposition } from "../lib/report/scoreComposition";
import { resolveScoringBasis } from "../lib/report/scoringBasis";
import { buildInputChoiceModel } from "../lib/report/countedInputs";
import { buildCalibrationChoice } from "../lib/report/confidenceCalibration";
import { describeBaseRateMonth } from "../lib/report/evidenceReaderModel";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";

const mockAny: any = mock;
/* Spread rather than replaced: `mock.module` patches the registry process-wide. */
mockAny.module("next/navigation", () => ({
  ...nextNavigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => "/signals",
  useSearchParams: () => new URLSearchParams(),
}));

const { AdvancedThresholdsSection } = await import("../app/signals/components/advancedThresholdsSection");
const { DistanceHeldChoice } = await import("../app/trust/distanceHeldChoice");

const treasury: TreasuryData = {
  source: "https://fred.stlouisfed.org/series/DGS1MO",
  record_date: "2026-09-25",
  fetched_at: "2026-09-26T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 3.7, twoYear: 4.0, tenYear: 4.2 },
  oneMonthHistory: [
    { date: "2026-06-25", value: 3.1 },
    { date: "2026-09-25", value: 3.7 },
  ],
};

const macro = (id: MacroSeriesReading["id"], value: number): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "index",
  explanation: "",
  sourceLabel: "FRED",
  sourceUrl: `https://fred.stlouisfed.org/series/${id}`,
  formulaUrl: "/trust#formula-reference",
  record_date: "2026-09-25",
  fetched_at: "2026-09-26T00:00:00Z",
  isLive: true,
});

const macroSeries = [macro("CHICAGO_FCI", 0.35), macro("VIX_INDEX", 28), macro("VC_FUNDING_VELOCITY", -32.8), macro("TECH_LAYOFF_TREND", 66)];
const assessment = evaluateRegime(treasury, DEFAULT_THRESHOLDS, macroSeries, null, { baseRateHistory: treasury.oneMonthHistory });
const composition = buildScoreComposition({
  assessment,
  treasury,
  macroSeries,
  treasurySource: { label: "FRED", url: treasury.source },
  scoringBasis: resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment }),
  evaluate: evaluateRegime,
});

/*
 * The line settings on /signals hold which inputs count: a box per input /trust's
 * arithmetic adds up, under its score, ticked as published, with the engine's answer
 * right under the question. A form a reader fills in, so each box is a real label.
 */
describe("/signals: which inputs count", () => {
  const model = buildInputChoiceModel({
    composition,
    assessment,
    treasury,
    macroSeries,
    evaluate: evaluateRegime,
    choice: { without: ["curve"], with: [] },
  });
  assert.ok(model);
  const html = renderToStaticMarkup(
    <AdvancedThresholdsSection currentThresholds={assessment.thresholds} defaultOpen answer="Stormy" inputChoice={model} />,
  );
  const fieldset = html.slice(html.indexOf("data-input-choice"));

  it("asks the question in the reader's words and answers it in the next sentence", () => {
    assert.match(html, /What would conditions be with different lines or inputs\?/);
    assert.match(
      fieldset,
      /<legend[^>]*>Which inputs count\?<\/legend><p id="input-choice-result" aria-live="polite"[^>]*>Stormy either way: without the yield curve, risk appetite would be 0\.<\/p>/,
    );
  });

  it("draws a labelled box per input, in /trust's order, ticked as this choice counts them", () => {
    const boxes = [...fieldset.matchAll(/<label[^>]*>(<input type="checkbox"[^>]*data-input-source="([^"]+)"[^>]*\/>)<span[^>]*>([^<]+)<\/span><span[^>]*>([^<]+)(?:<!-- -->)?([^<]*)<\/span><\/label>/g)].map(
      (match) => ({
        checked: /\schecked=""/.test(match[1] ?? ""),
        source: match[2],
        name: match[3]?.replaceAll("&#x27;", "'"),
        points: `${match[4]}${match[5]}`,
      }),
    );
    assert.deepEqual(
      boxes.map((box) => box.source),
      ["rateLevel", "inversion", "rateSpeed", "financialConditions", "curve", "marketStress", "startupMarket"],
    );
    assert.deepEqual(
      boxes.map((box) => box.name),
      [...(composition?.tightness.parts ?? []), ...(composition?.riskAppetite.parts ?? []), composition?.riskAppetite.notCounted].map((part) => part?.name),
    );
    assert.deepEqual(
      boxes.filter((box) => !box.checked).map((box) => box.source),
      ["curve", "startupMarket"],
      "the left-out curve and the never-counted startup-market inputs",
    );
    assert.match(boxes.at(-1)?.points ?? "", /^Not counted: −11$/);
    assert.doesNotMatch(fieldset, /\sname="/, "the boxes sit in no form, so they carry no name");
    assert.match(fieldset, /<legend class="type-eyebrow">Funding pressure<\/legend>/);
    assert.match(fieldset, /<legend class="type-eyebrow">Risk appetite<\/legend>/);
  });

  it("links to the arithmetic the points come from, by that section's name", () => {
    assert.match(fieldset, /<a[^>]*href="\/trust#formula-reference"[^>]*>How the scores are built<\/a>/);
  });

  it("asks about lines alone where the reading offers no inputs", () => {
    const linesOnly = renderToStaticMarkup(
      <AdvancedThresholdsSection currentThresholds={assessment.thresholds} answer="Stormy" inputChoice={null} />,
    );
    assert.match(linesOnly, /What would conditions be with different lines\?/);
    assert.doesNotMatch(linesOnly, /data-input-choice/);
  });
});

/*
 * /trust's "How close conditions are to changing" lays every distance beside the one the
 * strip quotes: a question, its answer as the caption of the squares it counts, and a
 * link per distance.
 */
describe("/trust: how often conditions held at each distance", () => {
  const groups = buildCalibrationChoice({ distance: 12, requested: undefined });
  const html = renderToStaticMarkup(
    <DistanceHeldChoice
      groups={groups}
      marksFor={(group) => group.entries.map(describeBaseRateMonth)}
      hrefFor={(group) => `/trust?distance=${group.from}#distance-held`}
    />,
  );
  const selected = groups.find((group) => group.selected);
  assert.ok(selected);

  it("answers the question in the next sentence, as the caption of the squares", () => {
    assert.match(
      html,
      new RegExp(
        `<h3[^>]*>How often did conditions hold\\?</h3><figure[^>]*><figcaption[^>]*>(Every month|Mostly|More often than not|Half the time|Less often than not|Never): conditions held ${selected.held} of ${selected.months} months at ${selected.label}\\.</figcaption>`,
      ),
    );
  });

  it("draws one square per month counted, each opening its month", () => {
    const squares = [...html.matchAll(/<a href="([^"]+)"[^>]*data-base-rate-mark="(held|changed)"[^>]*>/g)];
    assert.equal(squares.length, selected.months);
    assert.equal(squares.filter((square) => square[2] === "held").length, selected.held);
    for (const [tag, href] of squares) {
      const month = /month=(\d+)&(?:amp;)?year=(\d+)|year=(\d+)&(?:amp;)?month=(\d+)/.exec(href ?? "");
      assert.ok(month, href);
      /* `data-month` comes with the strip's own squares (`BaseRateMarks`), which this
         reuses unchanged; where they carry it, it names the month the square opens. */
      const dataMonth = /data-month="(\d{4}-\d{2})"/.exec(tag)?.[1];
      if (dataMonth) {
        const [year, monthNumber] = month[1] ? [month[2], month[1]] : [month[3], month[4]];
        assert.equal(dataMonth, `${year}-${String(monthNumber).padStart(2, "0")}`);
      }
    }
  });

  it("offers every distance as a link, the picked one current and this week's marked", () => {
    const options = [...html.matchAll(/<a[^>]*href="\/trust\?distance=(\d+)#distance-held"[^>]*>([\s\S]*?)<\/a>/g)];
    assert.deepEqual(options.map((option) => Number(option[1])), groups.map((group) => group.from));
    const current = [...html.matchAll(/<a[^>]*aria-current="page"[^>]*data-distance-option="(\d+)"/g)].map((match) => Number(match[1]));
    assert.deepEqual(current, [selected.from]);
    assert.match(html, /· this week<\/span>/);
    assert.doesNotMatch(html, /\b(band|bucket|probability|likely|chance|odds)\b/i);
  });
});
