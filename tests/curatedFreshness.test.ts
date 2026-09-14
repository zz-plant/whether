import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import { findStaleCuratedSeries } from "../scripts/check-curated-freshness";

/**
 * The curated series have no live fetcher, so the only thing that notices a
 * slipped curation pass is this check. A scanner that quietly finds nothing
 * would report a clean snapshot forever, so these pin detection against
 * timestamps on both sides of the SLA — not just the count.
 */
describe("curated freshness check", () => {
  const CURATED_IDS = [
    "VC_FUNDING_VELOCITY",
    "TECH_LAYOFF_TREND",
    "SAAS_VALUATION_MULTIPLE",
    "EARNINGS_REVISION_INDEX",
    "AI_COMPUTE_COST_TREND",
    "REGULATORY_RISK_TRACKER",
  ];

  it("flags a curated series past its SLA and keeps a current one out", () => {
    const now = new Date("2026-09-14T00:00:00.000Z");
    const stale = findStaleCuratedSeries(
      { series: CURATED_IDS.map((id) => ({ id, record_date: "2026-02-01" })) },
      now,
    );

    assert.equal(stale.length, CURATED_IDS.length);
    for (const entry of stale) {
      assert.equal(entry.recordDate, "2026-02-01");
      assert.ok(entry.ageDays > 45, "a February record against September should read as past SLA");
    }
  });

  it("reports nothing when every curated series is current", () => {
    const now = new Date("2026-09-14T00:00:00.000Z");
    const stale = findStaleCuratedSeries(
      { series: CURATED_IDS.map((id) => ({ id, record_date: "2026-08-20" })) },
      now,
    );

    assert.equal(stale.length, 0);
  });

  it("treats a missing or unparseable timestamp as past SLA rather than fresh", () => {
    const now = new Date("2026-09-14T00:00:00.000Z");
    const stale = findStaleCuratedSeries(
      {
        series: [
          { id: "VC_FUNDING_VELOCITY", record_date: "not-a-date" },
          { id: "TECH_LAYOFF_TREND" },
        ],
      },
      now,
    );

    // Two series carry unusable timestamps; the four not listed are treated the
    // same way — an absent curated series is not a fresh one.
    assert.equal(stale.length, CURATED_IDS.length);
    assert.ok(stale.every((entry) => !Number.isFinite(entry.ageDays)));
  });
});
