import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildUniqueMonthEntries,
  getRegimeSeriesCacheSize,
  getTimeMachineRegimeSeries,
  getTimeMachineSnapshots,
} from "../lib/timeMachine/timeMachineCache";

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
    assert.equal(series[series.length - 1]?.recordDate, asOf);
  });

});
