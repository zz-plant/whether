import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildDriverViews,
  buildFundingPressureDriverView,
  buildRiskAppetiteDriverView,
  buildFinancingDriverView,
  resolveLadderSubject,
  type DriverHistoryEntry,
} from "../lib/report/driverDecisionViews";

/** A tightness rule pause line matching the derived corridor (regime + 6). */
const tightnessPauseLine = { metric: "tightness" as const, operator: ">" as const, value: 76, label: "Funding pressure > 76" };
const riskPauseLine = { metric: "riskAppetite" as const, operator: "<" as const, value: 44, label: "Risk appetite < 44" };

/** Six months of trailing 1M-bill readings, oldest first, ending with the current one. */
const rateHistory = [3.65, 3.7, 3.75, 3.8, 3.85, 3.9, 3.9];

const month = (record_date: string, tightness: number, riskAppetite: number): DriverHistoryEntry => ({
  record_date,
  tightness,
  riskAppetite,
});

describe("funding pressure driver view", () => {
  it("renders the model's real action ladder with crossed state per line", () => {
    const view = buildFundingPressureDriverView({
      tightness: 74,
      weeklyDelta: 11,
      tightnessRegime: 70,
      rulePauseLine: tightnessPauseLine,
      rulePauseAction: "pause net-new hiring",
      history: [],
    });

    assert.deepEqual(view.ladder.map((line) => [line.value, line.action, line.crossed]), [
      [70, "the line that changes the call", true],
      [76, "pause net-new hiring", false],
    ]);
    assert.equal(view.ladder[0].points, 4);
    assert.equal(view.ladder[1].points, 2);
  });

  it("collapses the second rung when the rule's line duplicates the boundary", () => {
    const view = buildFundingPressureDriverView({
      tightness: 74,
      weeklyDelta: 0,
      tightnessRegime: 70,
      rulePauseLine: { metric: "tightness", operator: ">", value: 70, label: "Funding pressure > 70" },
      rulePauseAction: "pause",
      history: [],
    });

    assert.equal(view.ladder.length, 1);
  });

  it("counts consecutive months past the boundary over the rendered window only", () => {
    const history = [
      month("2026-06-30", 66, 58),
      month("2026-07-31", 72, 57),
      month("2026-08-31", 73, 56),
    ];
    const view = buildFundingPressureDriverView({
      tightness: 74,
      weeklyDelta: null,
      tightnessRegime: 70,
      history,
    });

    // The current reading is beyond, as are the last two months — the June
    // entry at 66 ends the count.
    assert.equal(view.beyondBoundaryMonths, 2);
  });

  it("reports zero months when the reading sits inside the boundary", () => {
    const view = buildFundingPressureDriverView({
      tightness: 56,
      weeklyDelta: null,
      tightnessRegime: 70,
      history: [month("2026-08-31", 66, 58)],
    });

    assert.equal(view.beyondBoundaryMonths, 0);
  });

  it("names the highest crossed line first for the consequence summary", () => {
    const view = buildFundingPressureDriverView({
      tightness: 80,
      weeklyDelta: null,
      tightnessRegime: 70,
      rulePauseLine: tightnessPauseLine,
      history: [],
    });

    const subject = resolveLadderSubject(view.ladder);
    assert.equal(subject?.value, 76);
    assert.equal(subject?.crossed, true);
  });
});

describe("risk appetite driver view", () => {
  it("states cushion to the boundary and to the rule pause line", () => {
    const view = buildRiskAppetiteDriverView({
      riskAppetite: 56,
      riskAppetiteRegime: 50,
      rulePauseLine: riskPauseLine,
      history: [],
    });

    assert.equal(view.boundaryValue, 50);
    assert.equal(view.cushionToBoundary, 6);
    assert.equal(view.rulePauseValue, 44);
    assert.equal(view.cushionToRulePause, 12);
  });

  it("computes the trend over the trailing window and projects months to boundary", () => {
    const history = [
      month("2026-04-30", 62, 64),
      month("2026-05-31", 62, 62),
      month("2026-06-30", 60, 60),
      month("2026-07-31", 60, 58),
      month("2026-08-31", 62, 56),
    ];
    const view = buildRiskAppetiteDriverView({
      riskAppetite: 56,
      riskAppetiteRegime: 50,
      history,
    });

    // 64 → 56 is -8 over 4 months; at 2 pts/month, 6 points of cushion ≈ 3 months.
    assert.deepEqual(view.trend, { points: -8, windowMonths: 4 });
    assert.equal(view.monthsToBoundaryAtPace, 3);
  });

  it("projects nothing when the trend is improving, flat, or the history is shallow", () => {
    const improving = buildRiskAppetiteDriverView({
      riskAppetite: 56,
      riskAppetiteRegime: 50,
      history: [
        month("2026-04-30", 62, 52),
        month("2026-05-31", 62, 53),
        month("2026-06-30", 60, 54),
        month("2026-07-31", 60, 55),
        month("2026-08-31", 62, 56),
      ],
    });
    assert.equal(improving.monthsToBoundaryAtPace, null);

    const shallow = buildRiskAppetiteDriverView({
      riskAppetite: 56,
      riskAppetiteRegime: 50,
      history: [month("2026-08-31", 62, 58)],
    });
    assert.equal(shallow.trend, null);
    assert.equal(shallow.monthsToBoundaryAtPace, null);
  });
});

describe("financing driver view", () => {

  it("states the horizon change in basis points, not the weekly print", () => {
    const view = buildFinancingDriverView({ baseRate: 3.9, baseRateUsed: "1M", rateHistory });

    assert.deepEqual(view.change, { bps: 25, windowMonths: 6 });
    assert.equal(view.currentRate, 3.9);
    assert.equal(view.rateSourceLabel, "The 1-month Treasury bill");
  });

  it("states the contribution anchor and ceiling from the model's real breakpoints", () => {
    const view = buildFinancingDriverView({ baseRate: 3.9, baseRateUsed: "1M", rateHistory });

    assert.equal(view.anchorRate, 3.5);
    assert.equal(view.contributionCeiling, 90);
    assert.equal(view.pointsAboveAnchor, 0.4);
    assert.equal(view.contributionOfCeiling, 72);
    assert.match(view.actsThroughLabel, /no posture threshold/);
  });

  it("reads at-or-below-anchor rates as contributing nothing, with no ceiling claim", () => {
    const view = buildFinancingDriverView({ baseRate: 3.4, baseRateUsed: "1M", rateHistory });

    assert.equal(view.pointsAboveAnchor, null);
    assert.equal(view.contributionOfCeiling, null);
  });

  it("reports no horizon change without window depth", () => {
    const view = buildFinancingDriverView({ baseRate: 3.9, baseRateUsed: "1M", rateHistory: [null, 3.85, 3.9] });

    assert.equal(view.change, null);
  });
});

describe("buildDriverViews", () => {
  it("borrows the printed corridor rule's own pause lines", () => {
    const views = buildDriverViews({
      tightness: 74,
      tightnessDelta: 11,
      riskAppetite: 56,
      tightnessRegime: 70,
      riskAppetiteRegime: 50,
      corridorPauseLines: [tightnessPauseLine, riskPauseLine],
      corridorPauseVerb: "Pause net-new hiring",
      baseRate: 3.9,
      baseRateUsed: "1M",
      history: [],
      rateHistory: rateHistory,
    });

    assert.deepEqual(views.fundingPressure.ladder.map((line) => line.value), [70, 76]);
    assert.equal(views.fundingPressure.ladder[1].action, "pause net-new hiring");
    assert.equal(views.riskAppetite.rulePauseValue, 44);
  });

  it("renders a single-rung ladder when no corridor rule is printed", () => {
    const views = buildDriverViews({
      tightness: 74,
      tightnessDelta: null,
      riskAppetite: 56,
      tightnessRegime: 70,
      riskAppetiteRegime: 50,
      baseRate: 3.9,
      baseRateUsed: undefined,
      history: [],
      rateHistory: [],
    });

    assert.deepEqual(views.fundingPressure.ladder.map((line) => line.value), [70]);
    assert.equal(views.riskAppetite.rulePauseValue, null);
  });
});
