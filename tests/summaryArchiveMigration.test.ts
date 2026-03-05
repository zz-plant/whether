import assert from "node:assert/strict";
import { describe, it } from "node:test";
import rawArchive from "../data/summary_archive.json";

describe("summary archive migration", () => {
  it("keeps weekly/monthly archive entries fully materialized", () => {
    const missingWeekly = rawArchive.filter(
      (entry) => entry.cadence === "weekly" && !entry.summary?.structured,
    );
    const missingMonthly = rawArchive.filter(
      (entry) => entry.cadence === "monthly" && !entry.summary?.structured,
    );

    assert.equal(missingWeekly.length, 0, "weekly archive entries should include summary.structured");
    assert.equal(missingMonthly.length, 0, "monthly archive entries should include summary.structured");
  });
});
