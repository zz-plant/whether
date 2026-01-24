/**
 * Time Machine helper tests for historical query and labels.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHistoricalQuery,
  formatHistoricalBanner,
  resolveHistoricalDate,
} from "../lib/timeMachine";

describe("time machine helpers", () => {
  it("builds a historical query filter", () => {
    assert.equal(buildHistoricalQuery("2024-03-31"), "record_date:lte:2024-03-31");
  });

  it("resolves the last day of a given month", () => {
    assert.equal(resolveHistoricalDate(2024, 2), "2024-02-29");
  });

  it("formats a historical banner label", () => {
    assert.equal(formatHistoricalBanner(2024, 5), "Historical mode active · 2024-05");
  });
});
