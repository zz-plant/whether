import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DEFAULT_THRESHOLDS, evaluateRegime } from "../lib/regimeEngine";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import type { ScoreMovement } from "../lib/report/reportDataTypes";
import { describeScoreMovement, describeScoreMovementLine, explainScoreMovement } from "../lib/report/scoreMovement";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";

/*
 * The page says funding pressure went from 63 to 90 and never said which inputs
 * account for the 27. The earlier reading is scored from interest rates alone,
 * while today's also carries the rate-speed term and the market inputs the
 * record scores, so part of a move can be an input the earlier score never had.
 * `explainScoreMovement` scores today's inputs in stages through the engine
 * itself, so these run the real engine and hold the property that matters: the
 * parts add up to the move the page shows, exactly, or nothing is printed. The
 * inputs outside the record (`RECORD_BASIS_MARKET_INPUTS`) move no published
 * score since 2026-10-09, so they are never a part of a move.
 */
const treasury: TreasuryData = {
  source: "US Treasury",
  record_date: "2026-09-25",
  fetched_at: "2026-09-26T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 3.7, twoYear: 4.0, tenYear: 4.2 },
  // A base rate that rose 0.6 points over the trailing quarter: the rate-speed term is live.
  // The inputs sit well under the scale's ends, where a clamp would swallow a part.
  oneMonthHistory: [
    { date: "2026-06-25", value: 3.1 },
    { date: "2026-09-25", value: 3.7 },
  ],
};
const earlier: TreasuryData = {
  source: "US Treasury",
  record_date: "2026-08-31",
  fetched_at: "2026-09-01T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 3.3, twoYear: 3.9, tenYear: 4.3 },
};

const macro = (id: MacroSeriesReading["id"], value: number): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "index",
  explanation: "",
  sourceLabel: "FRED",
  sourceUrl: "https://fred.stlouisfed.org/",
  formulaUrl: "/trust#formula-reference",
  record_date: "2026-09-25",
  fetched_at: "2026-09-26T00:00:00Z",
  isLive: true,
});

const startupInputs = [macro("VC_FUNDING_VELOCITY", -15), macro("TECH_LAYOFF_TREND", 80)];
const volatility = [macro("VIX_INDEX", 28)];
const credit = [macro("HY_CREDIT_SPREAD", 6.2), macro("CHICAGO_FCI", 0.35)];

const explain = (macroSeries: MacroSeriesReading[], withHistory = true) => {
  const today: TreasuryData = withHistory ? treasury : { ...treasury, oneMonthHistory: undefined };
  const previous = evaluateRegime(earlier, DEFAULT_THRESHOLDS).scores;
  const current = evaluateRegime(today, DEFAULT_THRESHOLDS, macroSeries, null, {
    baseRateHistory: today.oneMonthHistory,
  }).scores;
  return {
    previous,
    current,
    movement: explainScoreMovement({
      previous,
      current,
      treasury: today,
      thresholds: DEFAULT_THRESHOLDS,
      macroSeries,
      evaluate: evaluateRegime,
    }),
  };
};

const sum = (movement: ScoreMovement | undefined) => (movement?.parts ?? []).reduce((total, part) => total + part.points, 0);
const sources = (movement: ScoreMovement | undefined) => (movement?.parts ?? []).map((part) => part.source);

describe("explainScoreMovement", () => {
  it("splits a move made of rates alone into the rates and nothing else", () => {
    const { previous, current, movement } = explain([], false);

    assert.deepEqual(sources(movement?.tightness), ["rates"]);
    assert.deepEqual(sources(movement?.riskAppetite), ["curve"]);
    assert.equal(sum(movement?.tightness), current.tightness - previous.tightness);
    assert.equal(sum(movement?.riskAppetite), current.riskAppetite - previous.riskAppetite);
  });

  it("names each input the earlier score never had, and the parts add up to the move", () => {
    const cases: Array<{ name: string; series: MacroSeriesReading[]; tightness: string[]; riskAppetite: string[] }> = [
      { name: "rate speed", series: [], tightness: ["rates", "rateSpeed"], riskAppetite: ["curve"] },
      /* Outside the record: scored into `offRecord`, no part of the published move. */
      { name: "startup-market inputs", series: startupInputs, tightness: ["rates", "rateSpeed"], riskAppetite: ["curve"] },
      { name: "stock-market volatility", series: volatility, tightness: ["rates", "rateSpeed"], riskAppetite: ["curve", "marketStress"] },
      /* The Chicago Fed index counts (engine-2026-10-09b); the high-yield spread beside it does not. */
      { name: "credit stress", series: credit, tightness: ["rates", "rateSpeed", "financialConditions"], riskAppetite: ["curve"] },
      {
        name: "all of them",
        series: [...credit, ...volatility, ...startupInputs],
        tightness: ["rates", "rateSpeed", "financialConditions"],
        riskAppetite: ["curve", "marketStress"],
      },
    ];

    for (const { name, series, tightness, riskAppetite } of cases) {
      const { previous, current, movement } = explain(series);

      assert.deepEqual(sources(movement?.tightness), tightness, `${name}: funding pressure parts`);
      assert.deepEqual(sources(movement?.riskAppetite), riskAppetite, `${name}: risk appetite parts`);
      assert.equal(sum(movement?.tightness), current.tightness - previous.tightness, `${name}: funding pressure adds up`);
      assert.equal(sum(movement?.riskAppetite), current.riskAppetite - previous.riskAppetite, `${name}: risk appetite adds up`);
    }
  });

  it("leaves the inputs outside the record out of the move, while the score still reports what they would add", () => {
    const { previous, current, movement } = explain([...startupInputs, ...volatility, ...credit]);
    const withoutThem = explain([...volatility, ...credit.filter((series) => series.id === "CHICAGO_FCI")]);

    assert.deepEqual(movement, withoutThem.movement, "the startup-market reads and the high-yield spread change no part");
    assert.deepEqual(
      { tightness: current.tightness, riskAppetite: current.riskAppetite },
      { tightness: withoutThem.current.tightness, riskAppetite: withoutThem.current.riskAppetite },
      "nor the published scores",
    );
    assert.ok(current.offRecord, "they are scored into offRecord");
    assert.ok(current.offRecord.riskAppetite < current.riskAppetite, "which says what they would take off risk appetite");
    assert.equal(sum(movement?.riskAppetite), current.riskAppetite - previous.riskAppetite);
  });

  it("prints no split for a score it cannot rebuild from the inputs in hand", () => {
    const { previous, current } = explain(startupInputs);

    // A stored snapshot or a replay can carry a score these inputs do not reproduce.
    const unrebuildable = explainScoreMovement({
      previous,
      current: { ...current, tightness: current.tightness + 1 },
      treasury,
      thresholds: DEFAULT_THRESHOLDS,
      macroSeries: startupInputs,
      evaluate: evaluateRegime,
    });

    assert.equal(unrebuildable, undefined);
  });
});

describe("what a row and a paste say about the move", () => {
  const aug31 = comparisonBasis({ label: "Aug 31" });
  const fundingRow: ScoreMovement = { parts: [{ source: "rates", points: 27 }] };
  const riskRow: ScoreMovement = {
    parts: [
      { source: "curve", points: -2 },
      { source: "marketStress", points: -11 },
    ],
  };

  it("says a move made of rates alone is all from rates, with no caveat to make", () => {
    assert.equal(describeScoreMovement("tightness", fundingRow, aug31), "All from interest rates.");
  });

  it("gives each part its sign, and says the earlier score never had an input that is not rates", () => {
    assert.equal(
      describeScoreMovement("riskAppetite", riskRow, aug31),
      "-2 from the yield curve and -11 from stock-market volatility. The Aug 31 score was built from interest rates alone.",
    );
    assert.match(
      describeScoreMovement(
        "tightness",
        {
          parts: [
            { source: "rates", points: 30 },
            { source: "rateSpeed", points: 12 },
            { source: "financialConditions", points: -4 },
          ],
        },
        aug31,
      ) ?? "",
      /^\+30 from interest rates, \+12 from the recent pace of rate rises and -4 from financial-conditions stress\./,
    );
  });

  it("says nothing when nothing moved, and does not name a date it was not given", () => {
    assert.equal(describeScoreMovement("tightness", { parts: [] }, aug31), null);
    assert.equal(describeScoreMovement("tightness", undefined, aug31), null);
    assert.match(describeScoreMovement("riskAppetite", riskRow) ?? "", /The earlier score was built from interest rates alone\.$/);
  });

  it("puts both scores in one line for a paste, carrying the same caveat", () => {
    assert.equal(
      describeScoreMovementLine({ tightness: fundingRow, riskAppetite: riskRow }, aug31),
      "What moved the scores since Aug 31: funding pressure +27 (all from interest rates); risk appetite -13 (-2 from the yield curve and -11 from stock-market volatility). The Aug 31 scores were built from interest rates alone.",
    );
    // Rates alone need no caveat.
    assert.equal(
      describeScoreMovementLine({ tightness: fundingRow }, aug31),
      "What moved the scores since Aug 31: funding pressure +27 (all from interest rates).",
    );
    assert.equal(describeScoreMovementLine(undefined, aug31), null);
  });

  it("reports parts that cancel as no change, rather than as a move of zero", () => {
    const cancelling: ScoreMovement = {
      parts: [
        { source: "rates", points: 5 },
        { source: "financialConditions", points: -5 },
      ],
    };

    assert.match(describeScoreMovementLine({ tightness: cancelling }, aug31) ?? "", /funding pressure did not change \(\+5 from interest rates and -5 from financial-conditions stress/);
  });

  it("is written in the page's words, never the engine's", () => {
    const text = [
      describeScoreMovement("riskAppetite", riskRow, aug31),
      describeScoreMovementLine({ tightness: fundingRow, riskAppetite: riskRow }, aug31),
    ].join(" ");

    assert.doesNotMatch(text, /tightness|riskAppetite|regime|posture|payload|pipeline|veto|overlay/i);
  });
});
