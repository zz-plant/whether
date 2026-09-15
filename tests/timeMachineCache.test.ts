import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildUniqueMonthEntries,
  findTimeMachineGovernedAssessment,
  getRegimeSeriesCacheSize,
  getTimeMachineRegimeSeries,
  getTimeMachineSnapshots,
} from "../lib/timeMachine/timeMachineCache";
import { evaluateRegime } from "../lib/regimeEngine";

describe("time machine cache month entry helpers", () => {
  it("deduplicates repeated entries in the same month while preserving order", () => {
    const entries = buildUniqueMonthEntries([
      { year: 2024, month: 3 },
      { year: 2024, month: 3 },
      { year: 2024, month: 2 },
      { year: 2024, month: 2 },
      { year: 2024, month: 1 },
    ]);

    assert.deepEqual(entries, [
      { year: 2024, month: 3 },
      { year: 2024, month: 2 },
      { year: 2024, month: 1 },
    ]);
  });

  it("caps regime series memoization to a bounded number of keys", () => {
    for (let monthCount = 1; monthCount <= 65; monthCount += 1) {
      getTimeMachineRegimeSeries(monthCount);
    }

    assert.equal(getRegimeSeriesCacheSize() <= 50, true);
  });

  it("anchors regime series window to the requested historical as-of date", () => {
    const snapshots = getTimeMachineSnapshots();
    assert.equal(snapshots.length > 30, true);

    const asOf = snapshots[snapshots.length - 25]?.record_date;
    assert.ok(asOf);

    const series = getTimeMachineRegimeSeries(24, undefined, asOf);

    assert.equal(series.length, 24);
    assert.equal(series.at(-1)?.recordDate, asOf);
  });
});

describe("governed historical assessment", () => {
  it("matches the threaded walk entry for the same record date", () => {
    const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
    assert.ok(series.length > 0);
    for (const entry of [series[0], series[Math.floor(series.length / 2)], series.at(-1)!]) {
      const assessment = findTimeMachineGovernedAssessment(entry.recordDate);
      assert.ok(assessment);
      assert.equal(assessment.regime, entry.regime);
      assert.equal(assessment.scores.tightness, entry.tightness);
      assert.equal(assessment.scores.riskAppetite, entry.riskAppetite);
    }
  });

  it("returns null for dates outside the walk", () => {
    assert.equal(findTimeMachineGovernedAssessment("1990-01-31"), null);
  });

  /**
   * The whole point of the threaded lookup: a point evaluation reads the
   * snapshot against today's machine state and disagrees with the record. In
   * December 2024 the quadrant read says DEFENSIVE while the governed record —
   * the one /history publishes and the compare selector advertises — says
   * SCARCITY. A historical selection must resolve to the governed call.
   */
  it("resolves a historical month the point evaluation disagrees with", () => {
    const snapshots = getTimeMachineSnapshots();
    const december2024 = snapshots.find((s) => s.year === 2024 && s.month === 12);
    assert.ok(december2024);

    const point = evaluateRegime(december2024);
    const governed = findTimeMachineGovernedAssessment(december2024.record_date);
    assert.ok(governed);
    assert.equal(point.regime, "DEFENSIVE");
    assert.equal(governed.regime, "SCARCITY");
  });
});
