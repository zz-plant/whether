import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  formatNumberWithUnit,
  formatWeekEndingUTC,
  resolveWeekEndingIsoDateUTC,
  formatSignedDelta,
  formatMonthShortUtc,
  formatMonthLongYearUtc,
  formatAgeSpan,
  formatAgeHours,
  formatTimestampUTC,
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
    assert.equal(formatNumberWithUnit(174, "bps"), "174.00 basis points");
  });

  it("keeps percent values unchanged", () => {
    assert.equal(formatNumberWithUnit(3.75, "%"), "3.75%");
  });
});

describe("formatTimestampUTC", () => {
  // One shape on every runtime: Bun on macOS formats this skeleton as "Mar 10, 2026 at 8:00 PM
  // UTC" through the system ICU, Node and workerd as below.
  it("writes the same label whatever ICU the runtime carries", () => {
    assert.equal(formatTimestampUTC("2026-03-10T20:00:00Z"), "Mar 10, 2026, 8:00 PM UTC");
    assert.equal(formatTimestampUTC("2026-10-07T00:19:00.000Z"), "Oct 7, 2026, 12:19 AM UTC");
  });

  it("returns an unparseable value as given", () => {
    assert.equal(formatTimestampUTC("not a date"), "not a date");
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

describe("formatSignedDelta", () => {
  it("prefixes positive values with + at default precision", () => {
    assert.equal(formatSignedDelta(5), "+5");
    assert.equal(formatSignedDelta(0.6), "+1");
  });

  it("keeps negative values with leading minus at default precision", () => {
    assert.equal(formatSignedDelta(-3), "-3");
    assert.equal(formatSignedDelta(-0.4), "-0");
  });

  it("returns unsigned zero for exactly zero", () => {
    assert.equal(formatSignedDelta(0), "0");
    assert.equal(formatSignedDelta(-0), "0");
  });

  it("respects custom precision", () => {
    assert.equal(formatSignedDelta(2.567, 1), "+2.6");
    assert.equal(formatSignedDelta(-2.567, 2), "-2.57");
    assert.equal(formatSignedDelta(0, 3), "0.000");
  });
});

describe("month UTC formatting", () => {
  it("formats short month name deterministically", () => {
    assert.equal(formatMonthShortUtc(1), "Jan");
    assert.equal(formatMonthShortUtc(6), "Jun");
    assert.equal(formatMonthShortUtc(12), "Dec");
  });

  it("formats month and year long name deterministically", () => {
    assert.equal(formatMonthLongYearUtc(2026, 3), "March 2026");
    assert.equal(formatMonthLongYearUtc(2024, 11), "November 2024");
  });
});

describe("age formatting", () => {
  const now = new Date("2026-08-22T16:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it("buckets short ages by second, minute, and hour", () => {
    assert.equal(formatAgeSpan(ago(30 * SECOND), now), "30s");
    assert.equal(formatAgeSpan(ago(12 * MINUTE), now), "12m");
    assert.equal(formatAgeSpan(ago(6 * HOUR), now), "6h");
  });

  // A source frozen for months used to render as a raw hour count: the curated startup
  // snapshot, last written 2026-02-02, read as "4824h." on a live dashboard.
  it("buckets long ages by day and month instead of counting hours", () => {
    assert.equal(formatAgeSpan(ago(18 * DAY), now), "18d");
    assert.equal(formatAgeSpan(ago(45 * DAY), now), "45d");
    assert.equal(formatAgeSpan("2026-02-02T00:00:00.000Z", now), "7mo");
    assert.doesNotMatch(formatAgeSpan("2026-02-02T00:00:00.000Z", now) ?? "", /h$/);
  });

  it("returns null for a missing or unparseable timestamp", () => {
    assert.equal(formatAgeSpan(null, now), null);
    assert.equal(formatAgeSpan("not-a-date", now), null);
  });

  it("keeps the trailing-period form callers already render", () => {
    assert.equal(formatAgeHours(ago(12 * MINUTE), now), "12m.");
    assert.equal(formatAgeHours("2026-02-02T00:00:00.000Z", now), "7mo.");
    assert.equal(formatAgeHours(null, now), "\u2014");
  });
});
