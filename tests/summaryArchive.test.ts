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
    assert.equal(monthly.summary.structured.posture.label.length > 0, true);
    assert.equal(monthly.summary.structured.boundedNextActions.length > 0, true);
    assert.equal(monthly.summary.structured.reversalConditions.length > 0, true);
    assert.deepEqual(monthly.summary.structured.executionConstraints, monthly.summary.constraints);
    assert.equal(monthly.summary.structured.provenance.dataAge, "2h");
  });

  it("accepts weekly archive entries whose display label tracks week end while record_date lags", () => {
    const input = [
      {
        cadence: "weekly",
        year: 2026,
        week: 11,
        asOf: "2026-03-13",
        record_date: "2026-03-12",
        summary: {
          title: "Weekly action summary — Mar 13, 2026",
          summary: "Expand posture: sample summary.",
          regime: "EXPANSION",
          regimeLabel: "Expand",
          guidance: "scale proven bets",
          constraints: ["Keep payback discipline"],
          recordDateLabel: "Mar 13, 2026",
          provenance: {
            sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
            sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
            timestampLabel: "Mar 16, 2026, 01:15 AM",
            ageLabel: "0h.",
            statusLabel: "Historical (simulated)",
          },
          inputs: [
            {
              id: "ten-year",
              label: "US Treasury 10Y",
              value: 4.27,
              unit: "%",
              sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
              sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
              recordDate: "2026-03-12",
              fetchedAt: "2026-03-16T01:15:13.267Z",
            },
          ],
          copy: "Weekly action summary — Mar 13, 2026",
        },
      },
    ];

    const parsed = parseSummaryArchive(input);
    assert.equal(parsed.length, 1);

    const weekly = parsed[0];
    assert.equal(weekly.cadence, "weekly");
    assert.equal(weekly.asOf, "2026-03-13");
    assert.equal(weekly.record_date, "2026-03-12");
    assert.equal(weekly.summary.recordDateLabel, "Mar 13, 2026");
    assert.match(weekly.summary.title, /Mar 13, 2026/);
    assert.equal(weekly.summary.inputs[0].recordDate, "2026-03-12");
  });
});
