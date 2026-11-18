import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, evaluateRegime } from "../lib/regimeEngine";
import { buildScoreComposition } from "../lib/report/scoreComposition";
import { resolveScoringBasis } from "../lib/report/scoringBasis";
import {
  buildInputChoiceModel,
  describeLinesAndInputsAnswer,
  hasCustomLines,
  hasInputChoiceParams,
  parseInputChoice,
  writeInputChoiceParams,
  type InputChoice,
} from "../lib/report/countedInputs";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";

/*
 * `/signals` lets a reader leave out an input the published score counts, or count one it
 * leaves out, and says what the scores and the conditions would be. The inputs are
 * `/trust`'s arithmetic (`buildScoreComposition`), so the two pages name each one once;
 * the answers are the engine's own runs. These run the real engine and hold the three
 * things that matter: the published choice gives the published scores back, a left-out
 * input takes away what `/trust` says it gave (and more where the 100 ceiling had cut
 * the others short), and a counted one adds what the "Not counted" line says it would.
 */
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

const MARKET = [
  macro("CHICAGO_FCI", 0.35),
  macro("VIX_INDEX", 28),
  macro("HY_CREDIT_SPREAD", 5.5),
  macro("VC_FUNDING_VELOCITY", -32.8),
  macro("TECH_LAYOFF_TREND", 66),
];

const NONE: InputChoice = { without: [], with: [] };

const setup = (reading: TreasuryData = treasury, macroSeries: MacroSeriesReading[] = MARKET) => {
  const assessment = evaluateRegime(reading, DEFAULT_THRESHOLDS, macroSeries, null, {
    baseRateHistory: reading.oneMonthHistory,
  });
  const composition = buildScoreComposition({
    assessment,
    treasury: reading,
    macroSeries,
    treasurySource: { label: "FRED", url: reading.source },
    scoringBasis: resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment }),
    evaluate: evaluateRegime,
  });
  const model = (choice: InputChoice) =>
    buildInputChoiceModel({ composition, assessment, treasury: reading, macroSeries, evaluate: evaluateRegime, choice });
  return { assessment, composition, model };
};

describe("buildInputChoiceModel", () => {
  it("offers /trust's inputs, in its order and under its names, with the left-out ones unticked", () => {
    const { composition, model } = setup();
    assert.ok(composition);
    const published = model(NONE);
    assert.ok(published);
    assert.deepEqual(published.groups.map((group) => group.label), ["Funding pressure", "Risk appetite"]);
    assert.deepEqual(
      published.groups[0]?.options.map((option) => [option.name, option.counted]),
      [
        ...composition.tightness.parts.map((part) => [part.name, true]),
        [composition.tightness.notCounted?.name, false],
      ],
    );
    assert.deepEqual(
      published.groups[1]?.options.map((option) => [option.source, option.counted, option.published]),
      [
        ["curve", true, true],
        ["marketStress", true, true],
        ["startupMarket", false, false],
      ],
    );
    assert.equal(published.changed, false);
  });

  it("says the published scores and conditions back when nothing changes", () => {
    const { assessment, model } = setup();
    assert.equal(
      model(NONE)?.result,
      `Stormy with the published inputs: funding pressure ${assessment.scores.tightness}, risk appetite ${assessment.scores.riskAppetite}.`,
    );
  });

  it("takes away what /trust says an input gave, where no ceiling cut the others short", () => {
    const { assessment, composition, model } = setup();
    assert.ok(composition);
    for (const score of [composition.tightness, composition.riskAppetite]) {
      for (const part of score.parts) {
        const rescored = model({ without: [part.source], with: [] });
        assert.ok(rescored, part.source);
        const expected = Math.max(0, assessment.scores[score.metric] - part.points);
        assert.match(rescored.result, new RegExp(`${score.label.toLowerCase()} would (still )?be ${expected}\\.`), part.source);
      }
    }
  });

  it("counts a left-out input as the 'Not counted' line says it would", () => {
    const { assessment, composition, model } = setup();
    const notCounted = composition?.riskAppetite.notCounted;
    assert.ok(notCounted);
    assert.equal(
      model({ without: [], with: ["startupMarket"] })?.result,
      `Stormy either way: with startup-market inputs counted, risk appetite would be ${assessment.scores.riskAppetite + notCounted.points}.`,
    );
    const credit = composition?.tightness.notCounted;
    assert.ok(credit);
    assert.match(
      model({ without: [], with: ["credit"] })?.result ?? "",
      new RegExp(`with the high-yield credit spread counted, funding pressure would be ${assessment.scores.tightness + credit.points}\\.$`),
    );
  });

  it("leads with the conditions, and names every input and score the choice touches", () => {
    const { model } = setup();
    assert.equal(
      model({ without: ["curve"], with: [] })?.result,
      "Stormy either way: without the recession warning gauge, risk appetite would be 0.",
    );
    assert.equal(
      model({ without: ["inversion"], with: [] })?.result,
      "Stormy either way: without the recession warning gauge below zero, funding pressure would still be 64.",
    );
    assert.equal(
      model({ without: ["rateLevel", "curve"], with: [] })?.result,
      "Stormy either way: without the short-term borrowing rate and the recession warning gauge, funding pressure would be 28 and risk appetite would be 0.",
    );
    assert.equal(
      model({ without: ["curve", "marketStress"], with: ["startupMarket"] })?.result,
      "Stormy either way: without the recession warning gauge and stock-market volatility, and with startup-market inputs counted, risk appetite would be 0.",
    );
  });

  /* Funding pressure stops at 100. With the rate at 90, the inversion and the Chicago Fed
     index were cut to the 10 points left, so leaving the rate out gives them that room back:
     the engine's answer is 54, not 100 − 90. */
  it("runs the engine, so an input the ceiling cut short gets its room back", () => {
    const ceiling: TreasuryData = { ...treasury, yields: { oneMonth: 4.1, twoYear: 4.6, tenYear: 4.0 } };
    const { assessment, composition, model } = setup(ceiling, [macro("CHICAGO_FCI", 0.5), macro("VIX_INDEX", 18)]);
    assert.equal(assessment.scores.tightness, 100);
    const rate = composition?.tightness.parts.find((part) => part.source === "rateLevel");
    assert.equal(rate?.points, 90);
    const result = model({ without: ["rateLevel"], with: [] });
    assert.ok(result);
    assert.equal(result.result, "Stormy instead of Freezing: without the short-term borrowing rate, funding pressure would be 54.");
    assert.equal(result.regime, "VOLATILE");
  });

  it("drops a choice the reading does not offer, and offers nothing it cannot rebuild", () => {
    const { assessment, composition, model } = setup();
    const ignored = model({ without: ["startupMarket"], with: ["rateLevel"] });
    assert.deepEqual(ignored?.choice, NONE);
    assert.equal(ignored?.changed, false);
    /* A score an earlier engine published: the runs do not give it back. */
    const stored = { ...assessment, scores: { ...assessment.scores, riskAppetite: assessment.scores.riskAppetite + 3 } };
    assert.equal(
      buildInputChoiceModel({ composition, assessment: stored, treasury, macroSeries: MARKET, evaluate: evaluateRegime, choice: NONE }),
      null,
    );
    assert.equal(
      buildInputChoiceModel({ composition: null, assessment, treasury, macroSeries: MARKET, evaluate: evaluateRegime, choice: NONE }),
      null,
    );
  });
});

describe("the choice in the URL", () => {
  it("reads known inputs from either form of query, and writes a clean URL for the published choice", () => {
    assert.deepEqual(parseInputChoice({ without: "curve,nonsense,curve", with: "startupMarket" }), {
      without: ["curve"],
      with: ["startupMarket"],
    });
    assert.deepEqual(parseInputChoice(new URLSearchParams("without=rateLevel,rateSpeed")), {
      without: ["rateLevel", "rateSpeed"],
      with: [],
    });
    assert.equal(hasInputChoiceParams({ without: "curve" }), true);
    assert.equal(hasInputChoiceParams({ without: "nonsense" }), false);
    assert.equal(hasInputChoiceParams(undefined), false);
    const params = new URLSearchParams("rates=1&without=curve");
    assert.equal(writeInputChoiceParams(params, { without: ["marketStress"], with: ["startupMarket"] }).toString(), "rates=1&without=marketStress&with=startupMarket");
    assert.equal(writeInputChoiceParams(params, NONE).toString(), "rates=1");
  });
});

describe("describeLinesAndInputsAnswer", () => {
  const linesText = "rate 3.5% · funding pressure 70 · risk appetite 50";
  const inputs = (changed: boolean) => ({ changed, result: "Stormy instead of Freezing: without the recession warning gauge, risk appetite would be 0." });
  it("answers with the lines in force until the inputs change, then with what the change gives", () => {
    assert.equal(describeLinesAndInputsAnswer({ customLines: false, inputs: inputs(false), linesText }), `Lines now: ${linesText}`);
    assert.equal(describeLinesAndInputsAnswer({ customLines: true, inputs: null, linesText }), `Lines now: ${linesText}`);
    assert.equal(
      describeLinesAndInputsAnswer({ customLines: false, inputs: inputs(true), linesText }),
      "Stormy instead of Freezing: without the recession warning gauge, risk appetite would be 0.",
    );
    /* The answer is judged against the reader's lines, so it names them after it. */
    assert.equal(
      describeLinesAndInputsAnswer({ customLines: true, inputs: inputs(true), linesText }),
      `Stormy instead of Freezing: without the recession warning gauge, risk appetite would be 0. Lines now: ${linesText}`,
    );
  });

  it("knows the published lines", () => {
    assert.equal(hasCustomLines(DEFAULT_THRESHOLDS, DEFAULT_THRESHOLDS), false);
    assert.equal(hasCustomLines({ ...DEFAULT_THRESHOLDS, riskAppetiteRegime: 52 }, DEFAULT_THRESHOLDS), true);
  });
});
