import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { evaluateRegime } from "../lib/regimeEngine";
import { resolvePublishedConfidence } from "../lib/report/confidence";
import { buildMonthlySummary } from "../lib/summary/monthlySummary";
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

  it("prints the published confidence, not the engine's confirmation gate", () => {
    // Funding pressure 90 (20 over its line), risk appetite 57 (7 over): the
    // engine's gate ranks the raw 7 and says MEDIUM; the published confidence
    // puts the risk gap on the funding-pressure scale (31.5) and says HIGH. The
    // shape of the Sep 22, 2026 week the summaries used to contradict.
    const record = {
      source: "https://example.com/treasury",
      record_date: "2026-09-22",
      fetched_at: "2026-09-22T12:00:00.000Z",
      isLive: true,
      yields: { oneMonth: 4.2, twoYear: 4.0, tenYear: 4.425 },
    };
    const assessment = evaluateRegime(record);
    assert.equal(assessment.scores.tightness, 90);
    assert.equal(assessment.scores.riskAppetite, 57);
    assert.equal(assessment.diagnostics.confidence, "MEDIUM");
    assert.equal(resolvePublishedConfidence({ assessment, record }).label, "HIGH");

    const provenance = {
      sourceLabel: "test",
      timestampLabel: "Sep 22, 2026",
      ageLabel: "1h",
      statusLabel: "Live",
    };
    const weekly = buildWeeklySummary({ assessment, provenance, record });
    const monthly = buildMonthlySummary({ assessment, provenance, record });
    for (const summary of [weekly, monthly]) {
      assert.equal(summary.confidence, "HIGH");
      assert.ok(summary.summary.includes("The read is solid"), summary.summary);
    }

    // A fallback reading older than five days drops a step, as on every page
    // (the record is dated in the past, so on any clock after Sep 27 it is stale).
    const staleFallback = { ...record, fallback_at: "2026-09-22T12:00:00.000Z", fallback_reason: "upstream down" };
    const stale = buildWeeklySummary({ assessment, provenance, record: staleFallback });
    assert.equal(stale.confidence, "MEDIUM");
    assert.ok(stale.summary.includes("The read is workable but not settled"), stale.summary);
  });
});
