import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCompactTrustSummary, buildTrustStatus } from "../lib/report/trustStatus";
import { buildCompactFreshnessMeta } from "../lib/report/reportFormatting";

describe("buildTrustStatus trust tones", () => {
  it("returns stable trust copy with explicit decision impact and low-confidence action", () => {
    const result = buildTrustStatus({
      historicalSelection: false,
      isFallback: false,
      historicalAction: "unused",
      fallbackAction: "unused",
      stableAction: "Proceed with normal approvals.",
    });

    assert.equal(result.trustStatusTone, "stable");
    assert.match(result.trustStatusLabel, /Live • Treasury verified/);
    assert.match(result.trustStatusDetail, /do now \/ hold \/ revisit/);
    assert.match(result.trustStatusAction, /Trigger: confidence drops/);
    assert.match(result.trustStatusAction, /Reversal: return to standard cadence/);
  });

  it("returns warning trust copy that keeps decision path but stages irreversible approvals", () => {
    const result = buildTrustStatus({
      historicalSelection: false,
      isFallback: true,
      fallbackReason: "Treasury API timeout.",
      historicalAction: "unused",
      fallbackAction: "Use cached read for pacing.",
      stableAction: "unused",
    });

    assert.equal(result.trustStatusTone, "warning");
    assert.match(result.trustStatusLabel, /Using last verified snapshot/);
    assert.match(result.trustStatusDetail, /keep today’s do now \/ hold \/ revisit path/);
    assert.match(result.trustStatusDetail, /Source issue: Treasury API timeout/);
    assert.match(result.trustStatusAction, /Trigger: confidence LOW or feed unavailable/);
    assert.match(result.trustStatusAction, /Reversal: resume normal approvals/);
  });

  it("returns historical trust copy for retrospective use with explicit confidence fallback action", () => {
    const result = buildTrustStatus({
      historicalSelection: true,
      isFallback: false,
      historicalAction: "Use this view for retrospective review.",
      fallbackAction: "unused",
      stableAction: "unused",
    });

    assert.equal(result.trustStatusTone, "historical");
    assert.match(result.trustStatusLabel, /Historical snapshot/);
    assert.match(result.trustStatusDetail, /retrospective only/);
    assert.match(result.trustStatusAction, /Trigger: confidence LOW/);
    assert.match(result.trustStatusAction, /Reversal: switch to current data/);
  });

  it("keeps compact freshness/trust wording aligned for degraded snapshots", () => {
    const freshness = buildCompactFreshnessMeta({
      updatedAtLabel: "",
      confidenceLabel: "MED",
      isFallbackSnapshot: true,
    });
    const trust = buildCompactTrustSummary({
      confidenceLabel: "MED",
      freshnessLabel: freshness.updatedAtLabel,
      isFallbackSnapshot: true,
    });

    assert.match(freshness.line, /degraded/);
    assert.match(trust, /Cached snapshot/);
    assert.match(trust, /Unavailable/);
  });

});
