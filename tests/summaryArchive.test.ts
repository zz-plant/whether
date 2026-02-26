import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSummaryArchive } from "../lib/summary/summaryArchive";

describe("parseSummaryArchive", () => {
  it("hydrates missing weekly/monthly structured blocks for legacy archive entries", () => {
    const input = [
      {
        cadence: "weekly",
        year: 2026,
        week: 7,
        asOf: "2026-02-14",
        record_date: "2026-02-14",
        summary: {
          title: "Weekly action summary — Feb 14, 2026",
          summary: "Growth Mode posture: sample summary.",
          regime: "EXPANSION",
          regimeLabel: "Growth Mode",
          guidance: "scale proven bets",
          constraints: ["Keep payback discipline"],
          recordDateLabel: "Feb 14, 2026",
          provenance: {
            sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
            sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
            timestampLabel: "Feb 14, 2026, 09:00 AM",
            ageLabel: "2h",
            statusLabel: "Live",
          },
          inputs: [],
          copy: "legacy weekly copy",
        },
      },
      {
        cadence: "monthly",
        year: 2026,
        month: 2,
        asOf: "2026-02-14",
        record_date: "2026-02-14",
        summary: {
          title: "Monthly action summary — Feb 2026",
          summary: "Growth Mode posture: sample summary.",
          regime: "EXPANSION",
          regimeLabel: "Growth Mode",
          guidance: "scale proven bets",
          constraints: ["Keep payback discipline"],
          recordDateLabel: "Feb 14, 2026",
          provenance: {
            sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
            sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
            timestampLabel: "Feb 14, 2026, 09:00 AM",
            ageLabel: "2h",
            statusLabel: "Live",
          },
          inputs: [],
          copy: "legacy monthly copy",
        },
      },
    ];

    const parsed = parseSummaryArchive(input);

    assert.equal(parsed.length, 2);
    const weekly = parsed[0];
    const monthly = parsed[1];

    assert.equal(weekly.cadence, "weekly");
    assert.deepEqual(weekly.summary.structured.executionConstraints, weekly.summary.constraints);
    assert.equal(weekly.summary.structured.climate.label.length > 0, true);
    assert.equal(weekly.summary.structured.recommendedMoves.length > 0, true);

    assert.equal(monthly.cadence, "monthly");
    assert.deepEqual(monthly.summary.structured.executionConstraints, monthly.summary.constraints);
    assert.equal(monthly.summary.structured.provenance.dataAge, "2h");
  });
});
