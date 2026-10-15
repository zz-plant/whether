import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DEFAULT_THRESHOLDS, evaluateRegime } from "../lib/regimeEngine";
import { buildComparedWith, comparisonBasis } from "../lib/report/comparisonBasis";
import { findSignalDelta } from "../lib/report/evidenceReaderModel";
import { loadReportDataSafe } from "../lib/report/reportData";
import { buildReportDynamics } from "../lib/report/reportEvidence";
import { getPreviousTimeMachineSnapshot } from "../lib/timeMachine/timeMachineCache";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * Every "last week" the product printed for a score was the change since the
 * previous Time Machine snapshot, and that cache is monthly, so on a Sep 25 read
 * it was Aug 31. The loader now records the date it compared with, and every
 * surface names it (`lib/report/comparisonBasis.ts`). These pin the vocabulary
 * and the loader's half of the contract; each surface's own test pins what it
 * prints.
 */
describe("buildComparedWith", () => {
  it("names the earlier reading by month and day when it is in the same year", () => {
    assert.deepEqual(buildComparedWith("2026-08-31", "2026-09-25"), { recordDate: "2026-08-31", label: "Aug 31" });
  });

  it("adds the year when the earlier reading is from another calendar year", () => {
    // A January read compares with the December month-end; "Dec 31" alone would read as this year's.
    assert.equal(buildComparedWith("2025-12-31", "2026-01-23")?.label, "Dec 31, 2025");
  });

  it("names nothing it cannot read, so the comparison stays unnamed instead of mis-named", () => {
    assert.equal(buildComparedWith("not a date", "2026-09-25"), undefined);
  });
});

describe("comparisonBasis", () => {
  it("says last week only where the week records no date", () => {
    const undated = comparisonBasis();

    assert.equal(undated.date, null);
    assert.deepEqual(
      [undated.label, undated.reference, undated.versus, undated.since, undated.when],
      ["Last week", "last week", "vs last week", "since last week", "last week"],
    );
  });

  it("prints the date in each place a phrase used to say last week", () => {
    const dated = comparisonBasis({ label: "Aug 31" });

    assert.equal(dated.date, "Aug 31");
    assert.deepEqual(
      [dated.label, dated.reference, dated.versus, dated.since, dated.when],
      ["Aug 31", "Aug 31", "vs Aug 31", "since Aug 31", "on Aug 31"],
    );
  });
});

describe("what the report's dynamics record", () => {
  const aug31 = getPreviousTimeMachineSnapshot("2026-09-25");
  const jul31 = getPreviousTimeMachineSnapshot("2026-08-31");

  it("carries the date of the reading it compared with, and nothing when it compared with none", () => {
    assert.ok(aug31 && jul31, "the bundled cache holds the last two month-ends");
    const current = evaluateRegime(aug31, DEFAULT_THRESHOLDS);
    const previous = evaluateRegime(jul31, DEFAULT_THRESHOLDS);
    const comparedWith = buildComparedWith(jul31.record_date, aug31.record_date);

    assert.deepEqual(buildReportDynamics({ current, previous, comparedWith }).comparedWith, comparedWith);
    assert.equal(buildReportDynamics({ current, previous }).comparedWith, undefined);
    // A date without a reading behind it would name a comparison nobody made.
    assert.equal(buildReportDynamics({ current, previous: null, comparedWith }).comparedWith, undefined);
  });

  it("is set by the loader from the snapshot the moves are measured against", async () => {
    const result = await loadReportDataSafe({}, { route: "/" });
    const { treasury, reportDynamics } = result.ok ? result.data : result.fallback;

    if (reportDynamics.directionLabel === "unavailable") {
      assert.equal(reportDynamics.comparedWith, undefined, "no comparison, no date");
      return;
    }
    const previous = getPreviousTimeMachineSnapshot(treasury.record_date);
    assert.ok(previous, "a comparison was made, so a snapshot sits before this record date");
    assert.equal(reportDynamics.comparedWith?.recordDate, previous.record_date);
    assert.match(reportDynamics.comparedWith?.label ?? "", /^[A-Z][a-z]{2} \d{1,2}(, \d{4})?$/);
  });

  it("splits each score's move so the parts add up to the move the page shows, or splits nothing", async () => {
    const result = await loadReportDataSafe({}, { route: "/" });
    const { reportDynamics } = result.ok ? result.data : result.fallback;
    const movement = reportDynamics.movement;

    if (reportDynamics.directionLabel === "unavailable") {
      assert.equal(movement, undefined, "no comparison, nothing to split");
      return;
    }
    // A replay or a stored snapshot the loader cannot rebuild carries no split; a split it does carry is exact.
    if (!movement) return;
    for (const key of ["tightness", "riskAppetite"] as const) {
      const total = (movement[key]?.parts ?? []).reduce((sum, part) => sum + part.points, 0);
      assert.ok(Math.abs(total - (findSignalDelta(reportDynamics, key) ?? 0)) < 1e-9, `${key}: the parts add up to the move`);
    }
  });
});
