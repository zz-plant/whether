import { formatThresholdNumber } from "../lib/formatters";
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildCadenceCallModel } from "../lib/report/cadenceCallModel";
import { evaluateRegime } from "../lib/regimeEngine";
import { getMonthlyActionGuidance } from "../lib/summary/monthlySummary";
import { getQuarterlyActionGuidance } from "../lib/summary/quarterlySummary";
import { DECISION_CONTRACT_LABELS, POLICY_OVERRIDE_CALL } from "../lib/report/reportCopy";
import type { RegimeKey } from "../lib/regimeEngine";

const rawAssessment = evaluateRegime({
  source: "https://example.com/treasury",
  record_date: "2026-08-31",
  fetched_at: "2026-08-31T09:00:00.000Z",
  isLive: true,
  yields: {
    oneMonth: 5.2,
    twoYear: 4.8,
    tenYear: 4.5,
  },
});

/** Refusal is forced off for the default fixture and on for the override case. A bare
 *  treasury reading with no macro series refuses on its own, which would otherwise make
 *  every guidance assertion below test the override path by accident. */
const withRefusal = (refused: boolean, reasons: string[] = []) => ({
  ...rawAssessment,
  policyAssessment: {
    ...rawAssessment.policyAssessment,
    refusal: { ...rawAssessment.policyAssessment.refusal, refused, reasons },
  },
});

const assessment = withRefusal(false);

const history = (entries: Array<[string, RegimeKey]>) =>
  entries.map(([record_date, regime]) => ({ record_date, regime }));

const monthlyHistory = history([
  ["2026-03-31", "DEFENSIVE"],
  ["2026-04-30", "DEFENSIVE"],
  ["2026-05-31", "VOLATILE"],
  ["2026-06-30", "VOLATILE"],
  ["2026-07-31", "VOLATILE"],
  ["2026-08-31", "VOLATILE"],
]);

const build = (horizon: "monthly" | "quarterly", regimeHistory = monthlyHistory) =>
  buildCadenceCallModel({
    horizon,
    assessment,
    recordDate: "2026-08-31",
    recordDateLabel: "Aug 31, 2026",
    regimeHistory,
  });

describe("buildCadenceCallModel", () => {
  it("leads each horizon with its own guidance, not the other's", () => {
    const monthly = build("monthly");
    const quarterly = build("quarterly");

    assert.notEqual(monthly.headline, quarterly.headline);
    assert.ok(monthly.headline.toLowerCase().includes(getMonthlyActionGuidance(assessment.regime)));
    assert.ok(
      quarterly.headline.toLowerCase().includes(getQuarterlyActionGuidance(assessment.regime)),
    );
  });

  it("states the guidance as a sentence rather than a mid-clause fragment", () => {
    const { headline } = build("monthly");

    assert.equal(headline[0], headline[0].toUpperCase());
    assert.ok(headline.endsWith("."));
  });

  it("names the horizon in the bounded rule's action", () => {
    assert.ok(build("monthly").boundedRule.action.includes("this month's priority"));
    assert.ok(build("quarterly").boundedRule.action.includes("this quarter's priority"));
  });

  it("carries a guardrail and a reversal that quote different numbers", () => {
    const { boundedRule } = build("monthly");

    assert.notEqual(boundedRule.threshold, boundedRule.reversal);
    assert.match(boundedRule.threshold, /\d/);
    assert.match(boundedRule.reversal, /\d/);
  });

  it("carries the same thresholds as bands that the sentences quote as prose", () => {
    const { boundedRule, boundedBands } = build("monthly");

    assert.equal(boundedBands.length, 2);
    const [funding, risk] = boundedBands;

    assert.equal(funding.key, "tightness");
    assert.equal(risk.key, "riskAppetite");
    // Whatever the numbers are, the drawing and the paragraph have to agree on them.
    assert.ok(boundedRule.threshold.includes(formatThresholdNumber(funding.pause)));
    assert.ok(boundedRule.threshold.includes(formatThresholdNumber(risk.pause)));
    assert.ok(boundedRule.reversal.includes(formatThresholdNumber(funding.resume)));
    assert.ok(boundedRule.reversal.includes(formatThresholdNumber(risk.resume)));
  });

  it("points each band at the edge its own signal trips", () => {
    const [funding, risk] = build("monthly").boundedBands;

    // Funding pressure rises into trouble; risk appetite falls into it.
    assert.equal(funding.pauseWhen, "above");
    assert.equal(risk.pauseWhen, "below");
    assert.ok(funding.pause > funding.resume);
    assert.ok(risk.pause < risk.resume);
  });

  it("reports distance and state separately, so a tripped edge is not just a zero", () => {
    const tripped = buildCadenceCallModel({
      horizon: "monthly",
      assessment: {
        ...assessment,
        scores: { ...assessment.scores, tightness: 99, riskAppetite: 1 },
      },
      recordDate: "2026-08-31",
      regimeHistory: monthlyHistory,
    });

    for (const band of tripped.boundedBands) {
      assert.equal(band.pauseTripped, true);
      assert.equal(band.resumeHolds, false);
      assert.ok(band.toPause > 0, "a tripped edge still has a measurable distance");
    }
  });

  it("takes no prior read rather than inventing a flat one", () => {
    const withoutPrevious = build("monthly");
    const withPrevious = buildCadenceCallModel({
      horizon: "monthly",
      assessment,
      recordDate: "2026-08-31",
      regimeHistory: monthlyHistory,
      previousScores: { tightness: 40, riskAppetite: 70 },
    });

    assert.ok(withoutPrevious.boundedBands.every((band) => band.previous === null));
    assert.equal(withPrevious.boundedBands[0].previous, 40);
    assert.equal(withPrevious.boundedBands[1].previous, 70);
  });

  it("drops the bands under a refusal, where the triad is suppressed too", () => {
    const refused = buildCadenceCallModel({
      horizon: "monthly",
      assessment: withRefusal(true, ["Signals disagree."]),
      recordDate: "2026-08-31",
      regimeHistory: monthlyHistory,
    });

    assert.deepEqual(refused.boundedBands, []);
  });

  it("labels the period by month or by quarter", () => {
    assert.equal(build("monthly").periodLabel, "Aug 2026");
    assert.equal(build("quarterly").periodLabel, "Q3 2026");
  });

  it("collapses the monthly series to one point per quarter", () => {
    const quarterly = build("quarterly");

    assert.deepEqual(
      quarterly.history.map((point) => point.label),
      ["Q1 2026", "Q2 2026", "Q3 2026"],
    );
    // Q2 covers Apr–Jun and ends on VOLATILE, not the DEFENSIVE month it opened with.
    assert.equal(quarterly.history[1].regime, "VOLATILE");
  });

  it("keeps every month in the monthly series", () => {
    assert.equal(build("monthly").history.length, monthlyHistory.length);
  });

  it("marks the point whose period the card names, and only that one", () => {
    const points = build("monthly").history;

    assert.equal(points.filter((point) => point.isCurrent).length, 1);
    assert.ok(points.at(-1)?.isCurrent);
  });

  it("marks nothing current while the series still lags the record date", () => {
    // The month in progress reaches the series only when the cron writes it.
    const lagging = history([
      ["2026-06-30", "EXPANSION"],
      ["2026-07-31", "EXPANSION"],
    ]);

    const model = buildCadenceCallModel({
      horizon: "monthly",
      assessment,
      recordDate: "2026-08-31",
      regimeHistory: lagging,
    });

    assert.equal(model.periodLabel, "Aug 2026");
    assert.equal(model.history.at(-1)?.label, "Jul 2026");
    assert.equal(model.history.filter((point) => point.isCurrent).length, 0);
  });

  it("reports what the run of periods changed from", () => {
    assert.equal(
      build("monthly").historyDelta,
      "Moved to Stormy from Cloudy in May 2026.",
    );
  });

  it("counts the run instead when the window never changes regime", () => {
    const flat = history([
      ["2026-06-30", "EXPANSION"],
      ["2026-07-31", "EXPANSION"],
      ["2026-08-31", "EXPANSION"],
    ]);

    assert.equal(
      build("monthly", flat).historyDelta,
      "Sunny for every month shown — 3 months.",
    );
  });

  it("renders with no history at all", () => {
    const empty = build("monthly", []);

    assert.deepEqual(empty.history, []);
    assert.equal(empty.historyDelta, null);
    assert.ok(empty.headline.length > 0);
  });

  it("holds the call rather than repeating regime guidance under a policy override", () => {
    const model = buildCadenceCallModel({
      horizon: "monthly",
      assessment: withRefusal(true, ["Too many inputs are missing."]),
      recordDate: "2026-08-31",
      regimeHistory: monthlyHistory,
    });

    assert.equal(model.overrideReason, "Too many inputs are missing.");
    // Not `actionNow`: the weekly hero directly below the card leads with that under a
    // refusal, and two identical sentences on one screen is a copy defect.
    assert.equal(model.headline, POLICY_OVERRIDE_CALL.currentCall);
    assert.notEqual(model.headline, POLICY_OVERRIDE_CALL.actionNow);
    assert.equal(model.boundedRule.threshold, POLICY_OVERRIDE_CALL.pauseIf);
    assert.equal(model.boundedRule.reversal, POLICY_OVERRIDE_CALL.changeCourseIf);
    assert.ok(!model.headline.includes(getMonthlyActionGuidance(assessment.regime)));
    // The regime itself is unchanged by a refusal — only the instruction is.
    assert.equal(model.regime, assessment.regime);
  });

  it("reports no override when policy signals agree", () => {
    assert.equal(build("monthly").overrideReason, null);
  });

  it("ends the strip on the period the card is titled after", () => {
    const overshooting = history([
      ["2026-06-30", "EXPANSION"],
      ["2026-07-31", "EXPANSION"],
      ["2026-08-31", "EXPANSION"],
      ["2026-09-30", "SCARCITY"],
    ]);

    const model = buildCadenceCallModel({
      horizon: "monthly",
      assessment,
      // Mid-month record date: the August entry is stamped Aug 31 and must survive.
      recordDate: "2026-08-17",
      regimeHistory: overshooting,
    });

    assert.equal(model.periodLabel, "Aug 2026");
    assert.equal(model.history.at(-1)?.label, "Aug 2026");
  });

  it("names the artifact by horizon so a shared call is not labelled weekly", () => {
    assert.equal(build("monthly").shareTitle, "Whether Monthly Call");
    assert.equal(build("quarterly").shareTitle, "Whether Quarterly Call");
    assert.ok(build("monthly").shareLines.some((line) => line.startsWith(`${DECISION_CONTRACT_LABELS.threshold.pauseIf}: `)));
    assert.ok(build("monthly").shareLines.some((line) => line.startsWith(`${DECISION_CONTRACT_LABELS.reversal.changeCourseIf}: `)));
  });
});
