import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  formatNumberWithUnit,
  formatWeekEndingUTC,
  resolveWeekEndingIsoDateUTC,
} from "../lib/formatters";
import {
  formatQuarterLabel,
  formatSourceLine,
  formatYearLabel,
} from "../lib/summary/summaryFormatting";

describe("formatNumberWithUnit", () => {
  it("suppresses literal index suffixes", () => {
    assert.equal(formatNumberWithUnit(-0.52, "index"), "-0.52");
  });

  it("adds readable spacing for bps values", () => {
    assert.equal(formatNumberWithUnit(174, "bps"), "174.00 bps");
  });

  it("keeps percent values unchanged", () => {
    assert.equal(formatNumberWithUnit(3.75, "%"), "3.75%");
  });
});

describe("weekly week-ending formatting", () => {
  it("rolls midweek dates forward to the containing Friday", () => {
    assert.equal(resolveWeekEndingIsoDateUTC("2026-03-12"), "2026-03-13");
    assert.equal(formatWeekEndingUTC("2026-03-12"), "Mar 13, 2026");
  });

  it("keeps Friday dates unchanged", () => {
    assert.equal(resolveWeekEndingIsoDateUTC("2026-03-13"), "2026-03-13");
    assert.equal(formatWeekEndingUTC("2026-03-13"), "Mar 13, 2026");
  });
});


describe("summaryFormatting", () => {
  it("formats source line with and without URL", () => {
    assert.equal(
      formatSourceLine({
        sourceLabel: "US Treasury",
        sourceUrl: "https://example.com/source",
      }),
      "US Treasury (https://example.com/source)",
    );
    assert.equal(formatSourceLine({ sourceLabel: "US Treasury" }), "US Treasury");
  });

  it("extracts quarter and year labels from record dates", () => {
    assert.equal(formatQuarterLabel("2026-02-14"), "Q1 2026");
    assert.equal(formatYearLabel("2026-02-14"), "2026");
  });

  it("returns null quarter and year labels for invalid record dates", () => {
    assert.equal(formatQuarterLabel("not-a-date"), null);
    assert.equal(formatYearLabel("not-a-date"), null);
  });
});
