import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildRatesTrail,
  describeConditionChanges,
  describeFossilSummary,
  describeInversionSummary,
  describeRatesSummary,
  describeScoreTrendSummary,
  formatChangeLines,
  inversionSpreadOrder,
  monthOfLabel,
  summarizeConditionRuns,
  summarizeInversionMonths,
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
      "No: long-term rates stayed above short-term ones in all of the last 12 months",
    );
    assert.equal(
      describeInversionSummary({ months: 12, inverted10Y2Y: 0, inverted2Y3M: 6 }),
      "Yes: the 2-year rate below the 3-month rate in 6 of 12 months, and the 10-year rate below the 2-year rate in none",
    );
    assert.equal(
      describeInversionSummary({ months: 12, inverted10Y2Y: 9, inverted2Y3M: 4 }),
      "Yes: the 10-year rate below the 2-year rate in 9 of 12 months, and the 2-year rate below the 3-month rate in 4 of 12 months",
    );
  });
});

describe("score trend summary", () => {
  const points = (values: number[]) => values.map((value, index) => ({ label: index === values.length - 1 ? "Aug 2026" : `M${index}`, value }));

  it("reads one window per series, as the cells do", () => {
    assert.deepEqual(summarizeScoreWindow(points([90, 63])), { first: 90, last: 63, delta: -27, periodLabel: "Aug 2026", months: 1 });
    assert.equal(summarizeScoreWindow(points([90])), null, "one point is not a window");
  });

  it("says each move in words, with the window it covers", () => {
    assert.equal(
      describeScoreTrendSummary([
        { label: "Funding pressure", points: points([90, 70, 63]) },
        { label: "Risk appetite", points: points([56, 60, 56.2]) },
      ]),
      "Funding pressure down 27 to 63, risk appetite unchanged at 56 (2 months to Aug 2026)",
    );
    /* Thirteen month-ends are a twelve-month move. Twelve were printed as one,
       which is how an eleven-month change of -6 read as the year's. */
    assert.match(
      describeScoreTrendSummary([{ label: "Risk appetite", points: points([66, 62, 60, 62, 68, 70, 64, 52, 61, 59, 52, 59, 56]) }]) ?? "",
      /^Risk appetite down 10 to 56 \(12 months to Aug 2026\)$/,
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

/*
 * The pictures beside the closed questions (`instrumentPreviews.tsx`) and the
 * month rows in the opened panels read these, the same values the answers are
 * built from.
 */
describe("rates trail", () => {
  it("ends on the two readings the answer quotes: the last month-end before this reading, then this reading", () => {
    const current = { recordDate: "2026-10-05", oneMonth: 4.05 };
    const trail = buildRatesTrail({ current, series: [...SERIES, { recordDate: "2026-10-31", oneMonth: 4.2 }] });
    assert.deepEqual(
      trail?.map((point) => [point.recordDate, point.value, point.isCurrent]),
      [
        ["2025-12-31", 3.74, false],
        ["2026-07-31", 3.78, false],
        ["2026-08-31", 3.85, false],
        ["2026-10-05", 4.05, true],
      ],
    );
    assert.match(describeRatesSummary({ current, series: SERIES }) ?? "", /up from 3\.85% on Aug 31/);
  });

  it("keeps a year of month-ends, and gives nothing without a reading this week", () => {
    const series = Array.from({ length: 20 }, (_, index) => ({
      recordDate: `${2024 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-28`,
      oneMonth: 3 + index / 100,
    }));
    assert.equal(buildRatesTrail({ current: { recordDate: "2026-10-05", oneMonth: 4 }, series })?.length, 13);
    assert.equal(buildRatesTrail({ current: { recordDate: "2026-10-05", oneMonth: null }, series }), null);
  });
});

describe("inversion months", () => {
  const point = (recordDate: string, spread10Y2Y: number | null, spread2Y3M: number | null) => ({ recordDate, spread10Y2Y, spread2Y3M });
  /* Thirteen months, Oct 2025 to Oct 2026, the short end below zero in the four after the first. */
  const months = Array.from({ length: 13 }, (_, index) => {
    const year = 2025 + Math.floor((index + 9) / 12);
    const month = ((index + 9) % 12) + 1;
    return point(`${year}-${String(month).padStart(2, "0")}-15`, 0.3, index >= 1 && index <= 4 ? -0.1 : 0.2);
  });

  it("averages each month, keeps the last twelve, and counts the months each spread sat below zero", () => {
    const summary = summarizeInversionMonths([...months, point("2026-10-30", 0.3, 0.4)]);
    assert.equal(summary.months.length, 12);
    assert.equal(summary.months[0]?.label, "Nov 2025", "the oldest month falls off");
    assert.equal(summary.inverted10Y2Y, 0);
    assert.equal(summary.inverted2Y3M, 4);
    assert.deepEqual(summary.order, ["spread2Y3M", "spread10Y2Y"]);
    assert.equal(summary.months.at(-1)?.spread2Y3M?.toFixed(2), "0.30", "two readings in one month are averaged");
  });

  it("names the spread below zero more often first, the short end on a tie, as the answer does", () => {
    assert.deepEqual(inversionSpreadOrder({ inverted10Y2Y: 3, inverted2Y3M: 1 }), ["spread10Y2Y", "spread2Y3M"]);
    assert.deepEqual(inversionSpreadOrder({ inverted10Y2Y: 2, inverted2Y3M: 2 }), ["spread2Y3M", "spread10Y2Y"]);
    assert.match(
      describeInversionSummary({ months: 12, inverted10Y2Y: 3, inverted2Y3M: 1 }),
      /^Yes: the 10-year rate below the 2-year rate in 3 of 12 months, and the 2-year/,
    );
  });

  it("marks a month with no reading as not inverted", () => {
    const summary = summarizeInversionMonths([point("2026-01-31", null, null)]);
    assert.equal(summary.months[0]?.inverted10Y2Y, false);
    assert.equal(summary.inverted2Y3M, 0);
  });
});

describe("month labels", () => {
  it("reads the year and month a month label names, and nothing from a label no month prints", () => {
    assert.deepEqual(monthOfLabel("Oct 2026"), { year: 2026, month: 10 });
    assert.deepEqual(monthOfLabel("Jan 2025"), { year: 2025, month: 1 });
    assert.equal(monthOfLabel("Octember 2026"), null);
    assert.equal(monthOfLabel("this week"), null);
  });
});
