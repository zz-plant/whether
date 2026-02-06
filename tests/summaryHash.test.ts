import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSummaryHash } from "../lib/summary/summaryHash";

const baseSummary = {
  title: "Weekly action summary — 2026-02-01",
  summary: "Growth mode posture",
  regime: "EXPANSION",
  regimeLabel: "Growth Mode",
  guidance: "scale the highest-ROI bets",
  constraints: ["Maintain payback discipline"],
  recordDateLabel: "2026-02-01",
  provenance: {
    sourceLabel: "US Treasury Fiscal Data API",
    sourceUrl: "https://api.fiscaldata.treasury.gov/",
  },
} as const;

describe("summary hash", () => {
  it("is deterministic for identical payloads", () => {
    const first = buildSummaryHash(baseSummary as never);
    const second = buildSummaryHash(baseSummary as never);

    assert.equal(first, second);
    assert.equal(first.length, 8);
  });

  it("changes when stable summary fields change", () => {
    const baseline = buildSummaryHash(baseSummary as never);
    const changed = buildSummaryHash({ ...baseSummary, guidance: "tighten spend" } as never);

    assert.notEqual(baseline, changed);
  });
});
