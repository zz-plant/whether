import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegime } from "../lib/regimeEngine";
import { buildMonthlySummary } from "../lib/summary/monthlySummary";

describe("buildMonthlySummary", () => {
  it("returns structured sections and keeps copy derived from the structured payload", () => {
    const assessment = evaluateRegime({
      source: "https://example.com/treasury",
      record_date: "2026-02-14",
      fetched_at: "2026-02-14T09:00:00.000Z",
      isLive: true,
      yields: {
        oneMonth: 5.2,
        twoYear: 4.8,
        tenYear: 4.5,
      },
    });

    const summary = buildMonthlySummary({
      assessment,
      recordDateLabel: "Feb 14, 2026",
      provenance: {
        sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
        sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
        timestampLabel: "Feb 14, 2026, 09:00 AM",
        ageLabel: "2h",
        statusLabel: "Live",
      },
    });

    assert.ok(summary.structured);
    assert.deepEqual(summary.structured.executionConstraints, summary.constraints);
    assert.match(summary.copy, /Execution constraints:\n• /);
    assert.match(summary.copy, /Provenance:\nSource: /);
    assert.equal(summary.structured.provenance.dataAge, "2h");
  });
});
