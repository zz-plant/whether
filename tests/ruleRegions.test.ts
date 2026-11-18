import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { buildCanonicalBoundedDecisionRules, buildRuleCondition } from "../lib/report/boundedDecisionRules";
import { buildActionStripItems, resolveLineState, selectPauseCondition } from "../lib/report/operatingCalls";
import {
  buildAreaStateHistory,
  buildRuleChartModel,
  buildRuleRegions,
  compareOwnRule,
  describeRegionsAt,
  ruleFromNumbers,
  ruleFromStripItem,
  type AreaRule,
} from "../lib/report/ruleRegions";
import { planLinesFromRules } from "../lib/alert/planLines";
import { buildCountedChartHref, buildRuleChartHref, parseRuleChartArea, parseRuleChartCounted } from "../lib/report/ruleChartParams";

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
  it("names the region the reading is in, by the rules table's predicates", () => {
    const hiring = rule("hiring");
    assert.equal(
      describeRegionsAt(hiring, week, "This week's reading"),
      "Hiring pauses where Funding pressure > 76 or Risk appetite < 44 and restarts where Funding pressure < 66 and Risk appetite > 54. This week's reading is where Hiring pauses.",
    );
    assert.match(describeRegionsAt(hiring, { tightness: 60, riskAppetite: 60 }, "It"), /It is where Hiring restarts\.$/);
    assert.match(describeRegionsAt(hiring, { tightness: 70, riskAppetite: 50 }, "It"), /It is between the two, where nothing changes\.$/);
    /* A strict line is not met at the line: risk appetite 44 is not below 44. */
    assert.match(describeRegionsAt(rule("product-tempo"), week, "It"), /It is between the two/);
  });
});

describe("buildRuleChartModel", () => {
  const model = buildRuleChartModel({
    rules,
    scores: week,
    leadArea: "hiring",
    notCounted: [{ metric: "riskAppetite", score: 33 }],
    changeLines,
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
  });

  it("notes the conditions no region can draw", () => {
    assert.equal(
      model.areas.find((entry) => entry.area === "product-tempo")?.note,
      "Not drawn: Roadmap also pauses if two weekly readings in a row come in weaker, and its restart also waits until the weekly reading holds or improves.",
    );
    assert.equal(model.areas.find((entry) => entry.area === "burn-discipline")?.note, "Not drawn: Spending's restart also waits until the payback figures still hold.");
    assert.equal(model.areas.find((entry) => entry.area === "hiring")?.note, null);
  });

  it("plots the left-out reading and names only the areas whose state it would change", () => {
    assert.deepEqual(
      { tightness: model.counted?.tightness, riskAppetite: model.counted?.riskAppetite, regime: model.counted?.regime },
      { tightness: 90, riskAppetite: 33, regime: "SCARCITY" },
    );
    /* Risk appetite 33 crosses the 44 line of four areas, but three of them are paused already. */
    assert.equal(model.counted?.difference, "With startup-market inputs counted, Roadmap would pause.");
    assert.match(model.areas[1]?.description.counted ?? "", /The reading with startup-market inputs counted is where Roadmap pauses\.$/);
  });

  it("says so when the left-out inputs would change no area, and has no switch without them", () => {
    const quiet = buildRuleChartModel({ rules, scores: week, leadArea: null, notCounted: [{ metric: "tightness", score: 95 }], changeLines });
    assert.equal(quiet.counted?.difference, "With startup-market inputs counted, no area would pause or restart differently.");
    assert.equal(quiet.defaultArea, null);
    const none = buildRuleChartModel({ rules, scores: week, leadArea: "hiring", notCounted: [], changeLines });
    assert.equal(none.counted, null);
    assert.equal(none.areas[0]?.description.counted, null);
  });

  it("names restarts and lifted pauses when the left-out inputs ease the reading", () => {
    const easing = buildRuleChartModel({
      rules,
      scores: { tightness: 60, riskAppetite: 50 },
      leadArea: "hiring",
      notCounted: [{ metric: "riskAppetite", score: 58 }],
      changeLines,
    });
    assert.equal(
      easing.counted?.difference,
      "With startup-market inputs counted, the restart condition would hold for Hiring, Roadmap, Fundraising and New bets.",
    );
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

describe("compareOwnRule", () => {
  const published = planLinesFromRules(rules);
  const hiring = published.find((line) => line.area === "hiring")!;
  /* The published Hiring rule with some of its numbers moved, as the /operate form keeps a reader's. */
  const moved = (pause: [number, number], resume: [number, number]) => ({
    area: "hiring" as const,
    pause: [{ ...hiring.pause[0]!, value: pause[0] }, { ...hiring.pause[1]!, value: pause[1] }],
    resume: [{ ...hiring.resume[0]!, value: resume[0] }, { ...hiring.resume[1]!, value: resume[1] }],
  });
  /* The words a reader sees never name the mechanism. */
  const MECHANISM = /\b(lines?|regions?|outline|overlay|ghost|diff|delta|toggle|mini-map)\b/i;

  it("draws the published rule as the rules table's map does, and says nothing while no number moved", () => {
    for (const line of published) {
      const item = buildActionStripItems(rules, week).map(ruleFromStripItem).find((candidate) => candidate.area === line.area)!;
      assert.deepEqual(buildRuleRegions(ruleFromNumbers(line)), buildRuleRegions(item), line.area);
      const same = compareOwnRule({ published: line, own: line, scores: week });
      assert.deepEqual(same.regions, buildRuleRegions(item), line.area);
      assert.deepEqual([same.outline, same.changes, same.thisWeek], [[], [], null], line.area);
      assert.equal(same.description, describeRegionsAt(item, week, "This week's reading"));
    }
  });

  it("outlines only the side whose numbers moved, and says each move with its verb, its number and ours", () => {
    const later = compareOwnRule({ published: hiring, own: moved([76, 44], [60, 54]), scores: week });
    assert.deepEqual(later.changes, ["Later than ours: your Hiring restarts when funding pressure is below 60, not 66."]);
    assert.deepEqual(later.outline, [buildRuleRegions(ruleFromNumbers(moved([76, 44], [60, 54]))).resume]);
    assert.deepEqual(later.outline[0]?.edges.map((edge) => `${edge.metric}${edge.value}`), ["tightness60", "riskAppetite54"]);
    /* Paused by both at 90: nothing to say about this week. */
    assert.equal(later.thisWeek, null);

    const sooner = compareOwnRule({ published: hiring, own: moved([70, 48], [66, 50]), scores: week });
    assert.deepEqual(sooner.changes, [
      "Sooner than ours: your Hiring pauses if funding pressure is above 70, not 76.",
      "Sooner than ours: your Hiring pauses if risk appetite is below 48, not 44.",
      "Sooner than ours: your Hiring restarts when risk appetite is above 50, not 54.",
    ]);
    assert.equal(sooner.outline.length, 2);
    for (const sentence of [...later.changes, ...sooner.changes]) assert.doesNotMatch(sentence, MECHANISM, sentence);
  });

  it("says where the reader's numbers put the area this week when that differs from ours, by the table's predicates", () => {
    /* At 90 and 44 ours pauses Hiring; pause lines past the reading lift it, short of the restart. */
    const lifted = compareOwnRule({ published: hiring, own: moved([95, 40], [66, 54]), scores: week });
    assert.equal(lifted.thisWeek, "Hiring wouldn't pause this week by your numbers. By ours it does.");
    assert.deepEqual(lifted.changes, [
      "Later than ours: your Hiring pauses if funding pressure is above 95, not 76.",
      "Later than ours: your Hiring pauses if risk appetite is below 40, not 44.",
    ]);

    /* At 80 and 60 ours still pauses; a restart at 82 meets the reading. */
    const restarted = compareOwnRule({ published: hiring, own: moved([85, 44], [82, 54]), scores: { tightness: 80, riskAppetite: 60 } });
    assert.equal(restarted.thisWeek, "Hiring would restart this week by your numbers. By ours it stays paused.");

    /* At 70 and 60 ours is clear; a pause at 65 holds. */
    const paused = compareOwnRule({ published: hiring, own: moved([65, 44], [60, 54]), scores: { tightness: 70, riskAppetite: 60 } });
    assert.equal(paused.thisWeek, "Hiring would pause this week by your numbers, not by ours.");

    /* A move the reading does not reach changes nothing this week. */
    assert.equal(compareOwnRule({ published: hiring, own: moved([80, 44], [66, 54]), scores: week }).thisWeek, null);
    for (const sentence of [lifted.thisWeek, restarted.thisWeek, paused.thisWeek]) assert.doesNotMatch(sentence ?? "", MECHANISM);
  });
});

describe("rule chart params", () => {
  it("reads only a real area and the switch's one value", () => {
    assert.equal(parseRuleChartArea("capital-raising"), "capital-raising");
    assert.equal(parseRuleChartArea("fundraising"), undefined);
    assert.equal(parseRuleChartCounted("1"), true);
    assert.equal(parseRuleChartCounted("true"), false);
  });

  it("links to the chart counted, keeping the rest of the brief's query and its area", () => {
    assert.equal(buildCountedChartHref(undefined), "/?counted=1#what-would-change");
    assert.equal(
      buildCountedChartHref({ cadence: "monthly", rule: "hiring", counted: "0", empty: undefined }),
      "/?cadence=monthly&rule=hiring&counted=1#what-would-change",
    );
    assert.equal(buildRuleChartHref({ rule: "bogus", month: "9", year: "2026" }, { area: null, counted: false }), "/?month=9&year=2026#what-would-change");
  });
});
