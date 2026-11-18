import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { buildCanonicalBoundedDecisionRules, buildRuleCondition } from "../lib/report/boundedDecisionRules";
import { buildActionStripItems, resolveLineState, selectPauseCondition } from "../lib/report/operatingCalls";
import {
  buildAreaStateHistory,
  buildRuleChartModel,
  areaChangesAt,
  buildRuleRegions,
  describeAreaChanges,
  describeConditionsChange,
  describeRegionsAt,
  ruleFromStripItem,
  type AreaRule,
} from "../lib/report/ruleRegions";
import {
  buildCountedChartHref,
  buildRuleChartHref,
  parseRuleChartArea,
  parseRuleChartDecision,
  parseRuleChartReading,
} from "../lib/report/ruleChartParams";

/* This week's reading when the layer was built: Freezing, every rule but Roadmap's paused. */
const week = { tightness: 90, riskAppetite: 44 };
const changeLines = { tightness: 70, riskAppetite: 50 };
const rules = buildCanonicalBoundedDecisionRules({
  regime: "SCARCITY",
  thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
  scores: week,
});
const rule = (area: AreaRule["area"]) => {
  const found = rules.find((candidate) => candidate.area === area);
  if (!found) throw new Error(`no ${area} rule`);
  return found;
};

describe("buildRuleRegions", () => {
  it("draws an 'or' pause as an L of half-planes and an 'and' restart as one corner box", () => {
    const regions = buildRuleRegions(rule("hiring"));
    assert.deepEqual(regions.pause.rects, [
      { tightness: [76, 100], riskAppetite: [0, 100] },
      { tightness: [0, 100], riskAppetite: [0, 44] },
    ]);
    /* The L's inner edge only: each line stops where the other half-plane begins. */
    assert.deepEqual(regions.pause.edges, [
      { metric: "tightness", value: 76, span: [44, 100] },
      { metric: "riskAppetite", value: 44, span: [0, 76] },
    ]);
    assert.deepEqual(regions.resume.rects, [{ tightness: [0, 66], riskAppetite: [54, 100] }]);
    assert.deepEqual(regions.resume.edges, [
      { metric: "tightness", value: 66, span: [54, 100] },
      { metric: "riskAppetite", value: 54, span: [0, 66] },
    ]);
  });

  it("draws a one-line rule across the whole of the other score", () => {
    const regions = buildRuleRegions(rule("burn-discipline"));
    assert.deepEqual(regions.pause.rects, [{ tightness: [76, 100], riskAppetite: [0, 100] }]);
    assert.deepEqual(regions.pause.edges, [{ metric: "tightness", value: 76, span: [0, 100] }]);
    assert.deepEqual(regions.resume.rects, [{ tightness: [0, 66], riskAppetite: [0, 100] }]);
  });

  it("drops a line inside another line's half-plane, and a restart no reading can meet", () => {
    const nested = buildRuleRegions({
      area: "hiring",
      pause: { join: "or", conditions: [buildRuleCondition("tightness", ">", 70), buildRuleCondition("tightness", ">", 76)] },
      resume: { join: "and", conditions: [buildRuleCondition("tightness", "<", 40), buildRuleCondition("tightness", ">", 60)] },
    });
    assert.deepEqual(nested.pause.edges, [{ metric: "tightness", value: 70, span: [0, 100] }]);
    assert.deepEqual(nested.resume, { rects: [], edges: [] });
  });
});

describe("describeRegionsAt", () => {
  it("says where the reading sits in the area's own verb, by the rules table's predicates", () => {
    const hiring = rule("hiring");
    assert.equal(
      describeRegionsAt(hiring, week, "This week's reading"),
      "Hiring pauses where Funding pressure > 76 or Risk appetite < 44 and restarts where Funding pressure < 66 and Risk appetite > 54. This week's reading is where Hiring pauses.",
    );
    assert.match(describeRegionsAt(hiring, { tightness: 60, riskAppetite: 60 }, "It"), /It is where Hiring restarts\.$/);
    assert.match(describeRegionsAt(hiring, { tightness: 70, riskAppetite: 50 }, "It"), /It is between the two, where nothing changes\.$/);
    /* A strict line is not met at the line: risk appetite 44 is not below 44. */
    assert.match(describeRegionsAt(rule("product-tempo"), week, "It"), /It is between the two/);
    /* The drawing's name for it is not the reader's (2026-11-18). */
    assert.doesNotMatch(describeRegionsAt(hiring, week, "It"), /region/);
  });
});

describe("what another reading would move", () => {
  it("restarts a paused area only once its restart holds, and pauses any other once a pause line is met", () => {
    /* Funding pressure 60 and risk appetite 60: below every 66, above every 54. */
    assert.deepEqual(areaChangesAt(rules, week, { tightness: 60, riskAppetite: 60 }), {
      pauses: [],
      restarts: ["hiring", "capital-raising", "burn-discipline", "expansion-bets"],
    });
    /* Funding pressure 70 leaves the pause lines but not for a restart: on hold, nothing changes. */
    assert.deepEqual(areaChangesAt(rules, week, { tightness: 70, riskAppetite: 44 }), { pauses: [], restarts: [] });
    /* Roadmap is the one area not paused at 90 and 44; risk appetite 40 pauses it. */
    assert.deepEqual(areaChangesAt(rules, week, { tightness: 90, riskAppetite: 40 }), { pauses: ["product-tempo"], restarts: [] });
    /* An area that is not on hold has nothing to restart. */
    assert.deepEqual(areaChangesAt(rules, { tightness: 60, riskAppetite: 50 }, { tightness: 60, riskAppetite: 58 }), { pauses: [], restarts: [] });
  });

  it("leads with the answer, in the areas' order", () => {
    assert.equal(describeAreaChanges({ pauses: [], restarts: ["hiring", "capital-raising", "expansion-bets"] }), "Hiring, Fundraising and New bets would restart");
    assert.equal(describeAreaChanges({ pauses: ["product-tempo"], restarts: ["hiring"] }), "Hiring would restart and Roadmap would pause");
    assert.equal(describeAreaChanges({ pauses: [], restarts: [] }), "No area would pause or restart");
  });

  it("names new conditions only where the scores would land somewhere this week's do not", () => {
    assert.equal(describeConditionsChange({ regime: "SCARCITY", published: week, other: { tightness: 60, riskAppetite: 44 }, changeLines }), "Conditions would turn Stormy.");
    assert.equal(describeConditionsChange({ regime: "SCARCITY", published: week, other: { tightness: 80, riskAppetite: 30 }, changeLines }), null);
    /* A change awaiting confirmation: this week's scores already land in Stormy, so landing there again is not news. */
    assert.equal(describeConditionsChange({ regime: "SCARCITY", published: { tightness: 60, riskAppetite: 44 }, other: { tightness: 50, riskAppetite: 44 }, changeLines }), null);
  });
});

describe("buildRuleChartModel", () => {
  const model = buildRuleChartModel({
    rules,
    scores: week,
    leadArea: "hiring",
    notCounted: [{ metric: "riskAppetite", score: 33 }],
    changeLines,
    regime: "SCARCITY",
  });

  it("carries the five areas in the one order, each with its own sentences and side", () => {
    assert.deepEqual(model.areas.map((entry) => entry.area), ["hiring", "product-tempo", "capital-raising", "burn-discipline", "expansion-bets"]);
    assert.equal(model.defaultArea, "hiring");
    const fundraising = model.areas.find((entry) => entry.area === "capital-raising");
    assert.equal(fundraising?.held, true, "funding pressure 90 is past Fundraising's 76");
    /* The rule's own sentence, as the guidance block prints a restart line. */
    assert.equal(fundraising?.resumeLine, "Risk appetite is above 54 and funding pressure falls below 66");
    assert.equal(model.areas.find((entry) => entry.area === "burn-discipline")?.pauseLine, "Funding pressure is above 76. Funding pressure is 90 now.");
    assert.equal(model.areas.find((entry) => entry.area === "product-tempo")?.held, false);
    assert.equal(model.areas[0]?.where, "pause");
    assert.match(model.areas[0]?.rule ?? "", /^Hiring pauses where Funding pressure > 76/);
  });

  it("notes the conditions no region can draw", () => {
    assert.equal(
      model.areas.find((entry) => entry.area === "product-tempo")?.note,
      "Not drawn: Roadmap also pauses if two weekly readings in a row come in weaker, and its restart also waits until the weekly reading holds or improves.",
    );
    assert.equal(model.areas.find((entry) => entry.area === "burn-discipline")?.note, "Not drawn: Spending's restart also waits until the payback figures still hold.");
    assert.equal(model.areas.find((entry) => entry.area === "hiring")?.note, null);
  });

  it("offers the left-out reading, answering first with only the areas whose state it would change", () => {
    const counted = model.readings.find((reading) => reading.key === "counted");
    assert.deepEqual(
      { tightness: counted?.tightness, riskAppetite: counted?.riskAppetite, regime: counted?.regime, label: counted?.label },
      { tightness: 90, riskAppetite: 33, regime: "SCARCITY", label: "Startup-market inputs counted" },
    );
    /* Risk appetite 33 crosses the 44 line of four areas, but three of them are paused already. */
    assert.equal(counted?.answer, "Roadmap would pause. With startup-market inputs counted, risk appetite would be 33.");
    assert.equal(counted?.where["product-tempo"], "pause");
  });

  it("offers none without left-out inputs or a rate move, and opens on no rule where the sentence is not one", () => {
    const none = buildRuleChartModel({ rules, scores: week, leadArea: null, notCounted: [], changeLines });
    assert.deepEqual(none.readings, []);
    assert.equal(none.defaultArea, null);
    assert.equal(none.fundingPressureRates, null);
    const quiet = buildRuleChartModel({ rules, scores: week, leadArea: "hiring", notCounted: [{ metric: "tightness", score: 95 }], changeLines });
    assert.equal(quiet.readings[0]?.answer, "No area would pause or restart. With startup-market inputs counted, funding pressure would be 95.");
  });

  it("judges each Fed step against the rules and puts the areas first", () => {
    const stepped = buildRuleChartModel({
      rules,
      scores: week,
      leadArea: "hiring",
      notCounted: [],
      changeLines,
      regime: "SCARCITY",
      rateMoves: [{
        key: "cut-2",
        tightness: 18,
        riskAppetite: 60,
        label: "After two",
        name: "After two quarter-point Fed cuts",
        how: "Two quarter-point Fed cuts would take the 1-month rate to 3.60% and funding pressure to 18, with everything else as this week.",
      }],
    });
    assert.deepEqual(stepped.readings.map((reading) => reading.key), ["cut-2"]);
    assert.equal(
      stepped.readings[0]?.answer,
      "Hiring, Fundraising, Spending and New bets would restart. Conditions would turn Sunny. Two quarter-point Fed cuts would take the 1-month rate to 3.60% and funding pressure to 18, with everything else as this week.",
    );
    assert.equal(stepped.readings[0]?.regime, "EXPANSION");
  });

  it("carries the rate at each funding-pressure value a rule or the conditions turn on, where a lookup is given", () => {
    const rated = buildRuleChartModel({
      rules,
      scores: week,
      leadArea: "hiring",
      notCounted: [],
      changeLines,
      rateAtFundingPressure: { name: "1-month rate", at: (value) => (value < 90 ? 3.5 + value / 200 : null) },
    });
    assert.equal(rated.fundingPressureRates?.name, "1-month rate");
    assert.deepEqual(rated.fundingPressureRates?.values.map((entry) => entry.value), [66, 70, 76]);
  });
});

describe("buildAreaStateHistory", () => {
  const stripRules = buildActionStripItems(rules, week).map(ruleFromStripItem);
  const history = [
    { record_date: "2025-09-30", regime: "DEFENSIVE", tightness: 90, riskAppetite: 62 },
    { record_date: "2025-10-31", regime: "DEFENSIVE" },
    { record_date: "2026-08-31", regime: "EXPANSION", tightness: 72, riskAppetite: 56 },
    { record_date: "2026-07-31", regime: "EXPANSION", tightness: 50, riskAppetite: 59 },
  ];

  it("reads the strip's rules back as the same regions", () => {
    assert.deepEqual(buildRuleRegions(stripRules[0]!), buildRuleRegions(rule("hiring")));
  });

  it("judges each month-end with this week's lines, oldest first, skipping a month with no scores", () => {
    const months = buildAreaStateHistory(stripRules, history, 2);
    assert.deepEqual(months.map((month) => month.recordDate), ["2026-07-31", "2026-08-31"]);
    const august = months[1]!;
    assert.deepEqual({ year: august.year, month: august.month, label: august.label }, { year: 2026, month: 8, label: "Aug 2026" });
    assert.deepEqual(
      Object.fromEntries(august.states.map((entry) => [entry.area, entry.state])),
      { hiring: "near", "product-tempo": "clear", "capital-raising": "near", "burn-discipline": "near", "expansion-bets": "near" },
    );
    assert.equal(
      august.summary,
      "Aug 2026: Hiring, Fundraising, Spending and New bets close to pausing; Roadmap clear. Funding pressure 72, risk appetite 56.",
    );
  });

  it("agrees with the line the rules table judges each area by", () => {
    for (const month of buildAreaStateHistory(stripRules, history)) {
      const scores = { tightness: month.tightness, riskAppetite: month.riskAppetite };
      for (const entry of month.states) {
        const stripRule = stripRules.find((candidate) => candidate.area === entry.area)!;
        const line = selectPauseCondition([...stripRule.pause.conditions], scores);
        assert.equal(entry.state, resolveLineState(line?.pointsToLine, "pause", line?.satisfied), `${entry.area} ${month.recordDate}`);
      }
    }
  });
});

describe("rule chart params", () => {
  it("reads the area from the brief's decision, then the chart's old key, and only a real one", () => {
    assert.equal(parseRuleChartArea("capital-raising"), "capital-raising");
    assert.equal(parseRuleChartArea("fundraising"), undefined);
    assert.equal(parseRuleChartDecision({ decision: "hiring", rule: "capital-raising" }), "hiring");
    assert.equal(parseRuleChartDecision({ rule: "capital-raising" }), "capital-raising");
    assert.equal(parseRuleChartDecision({ decision: "bogus" }), undefined);
  });

  it("reads the reading by its key, and the old counted switch as the counted reading", () => {
    assert.equal(parseRuleChartReading({ reading: "cut-2" }), "cut-2");
    assert.equal(parseRuleChartReading({ reading: "cut-9" }), null);
    assert.equal(parseRuleChartReading({ counted: "1" }), "counted");
    assert.equal(parseRuleChartReading({ counted: "true" }), null);
    assert.equal(parseRuleChartReading({ reading: "hike-1", counted: "1" }), "hike-1");
    assert.equal(parseRuleChartReading(undefined), null);
  });

  it("links to the chart counted, keeping the rest of the brief's query and its area, in the new keys", () => {
    assert.equal(buildCountedChartHref(undefined), "/?reading=counted#what-would-change");
    assert.equal(
      buildCountedChartHref({ cadence: "monthly", rule: "hiring", counted: "0", empty: undefined }),
      "/?cadence=monthly&decision=hiring&reading=counted#what-would-change",
    );
    assert.equal(
      buildRuleChartHref({ rule: "bogus", month: "9", year: "2026", decision: "hiring" }, { area: null, reading: null }),
      "/?month=9&year=2026#what-would-change",
    );
    assert.equal(buildRuleChartHref({}, { area: "capital-raising", reading: "cut-1" }), "/?decision=capital-raising&reading=cut-1#what-would-change");
  });
});
