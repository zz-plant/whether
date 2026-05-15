import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCompactTrustSummary,
  buildDecisionReadinessState,
  buildTrustStatus,
} from "../lib/report/trustStatus";
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
    assert.equal(result.trustStatusDetail, "Proceed with normal approvals.");
    assert.match(result.trustStatusAction, /Clears when: return to standard cadence/);
    assert.equal(result.outageType, "live-data");
    assert.equal(result.outageSeverity, "advisory");
    assert.equal(result.outageExitGate.metCount, 2);
  });

  it("returns warning trust copy that keeps decision path but stages irreversible approvals", () => {
    const result = buildTrustStatus({
      historicalSelection: false,
      isFallback: true,
      fallbackReason: "Treasury API timeout.",
      historicalAction: "unused",
      fallbackAction: "Use cached read for pacing.",
      stableAction: "unused",
      freshnessLabel: "Unavailable",
    });

    assert.equal(result.trustStatusTone, "warning");
    assert.match(result.trustStatusLabel, /Using last verified snapshot/);
    assert.match(result.trustStatusDetail, /Pause big bets until live data resumes/);
    assert.match(result.trustStatusDetail, /Treasury API timeout/);
    assert.match(result.trustStatusAction, /Use cached read for pacing/);
    assert.match(result.trustStatusAction, /Clears when: resume normal approvals/);
    assert.equal(result.outageType, "feed-unavailable");
    assert.equal(result.outageSeverity, "critical");
    assert.equal(result.outageExitGate.metCount, 1);
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
    assert.match(result.trustStatusDetail, /Retrospective only/);
    assert.match(result.trustStatusAction, /Use this view for retrospective review/);
    assert.match(result.trustStatusAction, /Clears when: switch to current data/);
    assert.equal(result.outageType, "historical-snapshot");
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

  it("maps readiness to act, caution, and hold based on trust conditions", () => {
    assert.equal(
      buildDecisionReadinessState({
        confidenceLabel: "HIGH",
        freshnessLabel: "Updated 1h ago",
        isFallbackSnapshot: false,
      }).label,
      "Act",
    );

    assert.equal(
      buildDecisionReadinessState({
        confidenceLabel: "MED",
        freshnessLabel: "Updated 3h ago",
        isFallbackSnapshot: false,
      }).label,
      "Act with caution",
    );

    const hold = buildDecisionReadinessState({
      confidenceLabel: "LOW",
      freshnessLabel: "Unavailable",
      isFallbackSnapshot: true,
    });

    assert.equal(hold.label, "Hold");
    assert.match(hold.detail, /fresh data/i);
  });

  it("treats stale structured freshness as hold even when a timestamp string exists", () => {
    const hold = buildDecisionReadinessState({
      confidenceLabel: "HIGH",
      freshnessState: {
        updatedAtLabel: "2026-03-01T00:00:00Z",
        stalenessLabel: "stale",
        mode: "live",
        timestamp: "2026-03-01T00:00:00.000Z",
        ageHours: 18,
      },
      isFallbackSnapshot: false,
    });

    assert.equal(hold.label, "Hold");
    assert.match(hold.detail, /fresh data|contracts/i);
  });

  it("caps readiness at caution when policy refusal is active", () => {
    const caution = buildDecisionReadinessState({
      confidenceLabel: "HIGH",
      freshnessState: {
        updatedAtLabel: "2026-03-01T00:00:00Z",
        stalenessLabel: "fresh",
        mode: "live",
        timestamp: "2026-03-01T00:00:00.000Z",
        ageHours: 1,
      },
      isFallbackSnapshot: false,
      policyRefusalActive: true,
      policyRefusalReasons: ["Composite disagreement exceeded threshold."],
    });

    assert.equal(caution.label, "Act with caution");
    assert.match(caution.detail, /Policy override/i);
  });

});
