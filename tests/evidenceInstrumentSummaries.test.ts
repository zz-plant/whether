import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  describeConditionChanges,
  describeFossilSummary,
  describeInversionSummary,
  describeRatesSummary,
  describeScoreTrendSummary,
  formatChangeLines,
  summarizeConditionRuns,
  summarizeScoreWindow,
} from "../lib/report/evidenceInstrumentSummaries";

/*
 * The answers the "Deeper evidence" questions carry on /signals. The page-level
 * agreement with each panel is in tests/signalsPageFold.test.tsx; these are the
 * edges a week can land on.
 */

const SERIES = [
  { recordDate: "2025-12-31", oneMonth: 3.74 },
  { recordDate: "2026-07-31", oneMonth: 3.78 },
  { recordDate: "2026-08-31", oneMonth: 3.85 },
];

describe("rates summary", () => {
  it("compares this week's reading with the last month-end the charts draw", () => {
    assert.equal(
      describeRatesSummary({ current: { recordDate: "2026-10-05", oneMonth: 4.05 }, series: SERIES }),
      "1-month rate 4.05%, up from 3.85% on Aug 31",
    );
    assert.equal(
      describeRatesSummary({ current: { recordDate: "2026-09-10", oneMonth: 3.6 }, series: SERIES }),
      "1-month rate 3.60%, down from 3.85% on Aug 31",
    );
  });

  it("skips a month-end that is the reading itself, and dates one from another year", () => {
    assert.equal(
      describeRatesSummary({ current: { recordDate: "2026-07-31", oneMonth: 3.78 }, series: SERIES }),
      "1-month rate 3.78%, up from 3.74% on Dec 31, 2025",
    );
  });

  it("says unchanged when the printed figures match, and drops the comparison it cannot make", () => {
    assert.equal(
      describeRatesSummary({ current: { recordDate: "2026-09-04", oneMonth: 3.851 }, series: SERIES }),
      "1-month rate 3.85%, unchanged from Aug 31",
    );
    assert.equal(describeRatesSummary({ current: { recordDate: "2025-01-02", oneMonth: 4.3 }, series: SERIES }), "1-month rate 4.30%");
    assert.equal(describeRatesSummary({ current: { recordDate: "2026-10-05", oneMonth: null }, series: SERIES }), null);
  });
});

describe("inversion summary", () => {
  it("answers no only when neither spread went below zero", () => {
    assert.equal(
      describeInversionSummary({ months: 12, inverted10Y2Y: 0, inverted2Y3M: 0 }),
      "No: neither spread below zero in the last 12 months",
    );
    assert.equal(
      describeInversionSummary({ months: 12, inverted10Y2Y: 0, inverted2Y3M: 6 }),
      "Yes: 2Y−3M below zero in 6 of 12 months, 10Y−2Y in none",
    );
    assert.equal(
      describeInversionSummary({ months: 12, inverted10Y2Y: 9, inverted2Y3M: 4 }),
      "Yes: 10Y−2Y below zero in 9 of 12 months, 2Y−3M in 4 of 12 months",
    );
  });
});

describe("score trend summary", () => {
  const points = (values: number[]) => values.map((value, index) => ({ label: index === values.length - 1 ? "Aug 2026" : `M${index}`, value }));

  it("reads one window per series, as the cells do", () => {
    assert.deepEqual(summarizeScoreWindow(points([90, 63])), { first: 90, last: 63, delta: -27, periodLabel: "Aug 2026" });
    assert.equal(summarizeScoreWindow(points([90])), null, "one point is not a window");
  });

  it("says each move in words, with the window it covers", () => {
    assert.equal(
      describeScoreTrendSummary([
        { label: "Funding pressure", points: points([90, 70, 63]) },
        { label: "Risk appetite", points: points([56, 60, 56.2]) },
      ]),
      "Funding pressure down 27 to 63, risk appetite unchanged at 56 (3 month-ends to Aug 2026)",
    );
    assert.equal(describeScoreTrendSummary([{ label: "Funding pressure", points: [] }]), null);
  });
});

describe("lines, past months and habits", () => {
  it("names each line", () => {
    assert.equal(
      formatChangeLines({ baseRateTightness: 3.5, tightnessRegime: 70, riskAppetiteRegime: 50 }),
      "rate 3.5% · funding pressure 70 · risk appetite 50",
    );
  });

  it("counts changes between runs of conditions", () => {
    const month = (index: number, regime: "SCARCITY" | "EXPANSION") => ({ year: 2026, month: index, regime });
    const runs = summarizeConditionRuns([month(1, "EXPANSION"), month(2, "EXPANSION"), month(3, "SCARCITY")]);
    assert.equal(runs.changeCount, 1);
    assert.equal(runs.longestRun?.regime, "EXPANSION");
    assert.equal(runs.longestRun?.count, 2);
    assert.equal(describeConditionChanges(runs), "1 change across the last 3 months");
    assert.equal(describeConditionChanges({ changeCount: 0, months: 24 }), "No change across the last 24 months");
    assert.equal(describeConditionChanges({ changeCount: 3, months: 24 }), "3 changes across the last 24 months");
  });

  it("lists the habit areas, or nothing for an empty table", () => {
    assert.equal(describeFossilSummary([{ domain: "Infrastructure" }, { domain: "Org chart" }, { domain: "Roadmap" }]), "Infrastructure, org chart, and roadmap");
    assert.equal(describeFossilSummary([]), null);
  });
});
