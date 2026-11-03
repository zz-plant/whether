import assert from "node:assert/strict";
import { describe, it } from "bun:test";
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
    assert.equal(summary.structured.posture.label, summary.regimeLabel);
    assert.equal(summary.structured.posture.summary.length > 0, true);
    assert.equal(summary.structured.planningLanguage.length > 0, true);
    assert.equal(summary.structured.boundedNextActions.length > 0, true);
    assert.equal(summary.structured.operatingRules.length > 0, true);
    for (const rule of summary.structured.operatingRules) {
      assert.ok(rule.action.length > 0);
      assert.ok(rule.threshold.length > 0);
      assert.ok(rule.reversal.length > 0);
    }
    assert.equal(summary.structured.reversalConditions.length > 0, true);
    assert.deepEqual(summary.structured.executionConstraints, summary.constraints);
    assert.match(summary.copy, /CONDITIONS THIS MONTH/);
    assert.match(summary.copy, /PLANNING LANGUAGE TO USE/);
    assert.match(summary.copy, /\nNEXT ACTIONS\n/);
    assert.match(summary.copy, /MONTHLY OPERATING RULES/);
    assert.match(summary.copy, /RESTART LINES/);
    assert.match(summary.copy, /EXECUTION CONSTRAINTS\n\n• /);
    assert.match(summary.copy, /\n\nSource: /);
    assert.doesNotMatch(summary.copy, /Source:\nSource:/);
    assert.equal(summary.structured.provenance.dataAge, "2h");
  });

  const provenance = { sourceLabel: "FRED", timestampLabel: "Oct 5, 2026", ageLabel: "6m.", statusLabel: "Live" };
  const assessAt = (oneMonth: number, tenYear: number) =>
    evaluateRegime({
      source: "https://example.com/treasury",
      record_date: "2026-10-05",
      fetched_at: "2026-10-05T12:00:00.000Z",
      isLive: true,
      yields: { oneMonth, twoYear: 4.0, tenYear },
    });

  /*
   * TOP REVERSALS said "Restart paused work once the next reading confirms
   * conditions held." In Freezing, conditions holding is the reason the work is
   * paused, so the line told the reader to restart while still frozen. It names
   * the restart lines now, the same numbers as the operating rule above it.
   */
  it("restarts paused work at the restart lines, not when conditions merely held", () => {
    const freezing = assessAt(4.2, 4.2);
    assert.equal(freezing.regime, "SCARCITY");
    assert.equal(freezing.diagnostics.transitionWatch, true);

    const summary = buildMonthlySummary({ assessment: freezing, provenance });
    assert.equal(
      summary.structured.reversalConditions[0],
      "Restart paused work when funding pressure is below 66 and risk appetite is above 54.",
    );
    assert.equal(
      summary.structured.operatingRules[0]?.reversal,
      "Restart them when funding pressure is below 66 and risk appetite is above 54.",
    );
    assert.doesNotMatch(summary.copy, /conditions held/);

    // Stormy runs its own rules, each with its own restart line; the reversal names both.
    const stormy = assessAt(3.8, 4.2);
    assert.equal(stormy.regime, "VOLATILE");
    assert.equal(stormy.diagnostics.transitionWatch, true);
    assert.equal(
      buildMonthlySummary({ assessment: stormy, provenance }).structured.reversalConditions[0],
      "Reopen paused experiments when risk appetite is above 54, and paused fixed-cost approvals when funding pressure falls below 66.",
    );
  });
});
