import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegime } from "../lib/regimeEngine";
import { buildWeeklySummary } from "../lib/summary/weeklySummary";

describe("buildWeeklySummary", () => {
  it("generates a copy block that starts with summary context and bulleted weekly sections", () => {
    const assessment = evaluateRegime({
      source: "https://example.com/treasury",
      record_date: "2026-01-23",
      fetched_at: "2026-01-23T12:00:00.000Z",
      isLive: true,
      yields: {
        oneMonth: 5.6,
        twoYear: 5.1,
        tenYear: 3.9,
      },
    });

    const summary = buildWeeklySummary({
      assessment,
      recordDateLabel: "Jan 23, 2026",
      provenance: {
        sourceLabel: "US Treasury Daily Treasury Yield Curve Rates (via FRED)",
        sourceUrl: "https://fred.stlouisfed.org/series/DGS10",
        timestampLabel: "Jan 23, 2026, 12:00 PM",
        ageLabel: "1h",
        statusLabel: "Live",
      },
    });

    assert.ok(summary.copy.startsWith(`${summary.title}\n${summary.summary}\n\n---`));
    assert.match(summary.copy, /RECOMMENDED MOVES FOR PRODUCT TEAMS \(NOW\)\n\n• /);
    assert.match(summary.copy, /EXECUTION PRIORITIES THAT TRAVEL WELL\n\n• /);
    assert.match(summary.copy, /WATCHOUTS THAT BREAK EXECUTION\n\n• /);
    assert.ok(summary.structured);
    assert.deepEqual(summary.structured.executionConstraints, summary.constraints);
    assert.equal(summary.structured.planningLanguage.length > 0, true);
  });
});
