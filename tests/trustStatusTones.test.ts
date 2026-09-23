import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCompactTrustSummary,
  buildDecisionReadinessState,
  buildTrustStatus,
} from "../lib/report/trustStatus";
import { buildCompactFreshnessMeta } from "../lib/report/reportFormatting";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";

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
    assert.match(result.trustStatusLabel, /Live · all sources answered/);
    assert.equal(result.trustStatusDetail, "Every source answered and nothing here argues for holding back this week.");
    assert.match(result.trustStatusAction, /Proceed with normal approvals\./);
    assert.ok(result.trustStatusAction.includes("Hold back if confidence drops to low or conditions move within reach of a line"));
    assert.equal(result.outageType, "live-data");
    assert.equal(result.outageSeverity, "advisory");
    assert.equal(result.outageExitGate.metCount, 2);
    assert.equal(
      result.decisionImpactWindow,
      "Use this live reading for this week's approvals; the pause lines in this week's guidance apply.",
    );
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
    assert.match(result.trustStatusLabel, /Using cached data/);
    assert.match(result.trustStatusDetail, /Live data is late; this is a cached reading/);
    assert.match(result.trustStatusDetail, /Treasury API timeout/);
    assert.match(result.trustStatusAction, /Use cached read for pacing/);
    assert.ok(result.trustStatusAction.includes(`${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: live data returns from every source`));
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
    assert.match(result.trustStatusDetail, /A past week, not this one/);
    assert.match(result.trustStatusAction, /Use this view for retrospective review/);
    assert.ok(result.trustStatusAction.includes("Switch to current live data"));
    assert.equal(result.outageType, "historical-snapshot");
  });

  it("returns policy-refusal trust copy that holds approvals and surfaces the reason", () => {
    const result = buildTrustStatus({
      historicalSelection: false,
      isFallback: false,
      historicalAction: "unused",
      fallbackAction: "unused",
      stableAction: "unused",
      policyRefusalActive: true,
      policyRefusalReasons: ["Composite disagreement exceeded threshold."],
    });

    assert.equal(result.trustStatusTone, "warning");
    assert.match(result.trustStatusLabel, /Live data, but signals unstable/);
    assert.match(result.trustStatusDetail, /the two scores point in different directions, so the guidance is not changing this week/);
    assert.match(result.trustStatusDetail, /Reason: Composite disagreement exceeded threshold\./);
    assert.match(result.trustStatusAction, /Keep approvals reversible\./);
    assert.ok(result.trustStatusAction.includes(`${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: the two scores point the same way again`));
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
    assert.match(hold.detail, /Live data is late/);
  });

  it("treats stale structured freshness as hold even when a timestamp string exists", () => {
    const hold = buildDecisionReadinessState({
      confidenceLabel: "HIGH",
      freshnessState: {
        updatedAtLabel: "2026-03-01T00:00:00Z",
        freshnessStatus: "stale",
        mode: "live",
        timestamp: "2026-03-01T00:00:00.000Z",
        ageHours: 18,
      },
      isFallbackSnapshot: false,
    });

    assert.equal(hold.label, "Hold");
    assert.match(hold.detail, /Live data is late/);
  });

  it("holds on low confidence with fresh data, and says why without an engine word", () => {
    const hold = buildDecisionReadinessState({
      confidenceLabel: "LOW",
      freshnessLabel: "Updated 1h ago",
      isFallbackSnapshot: false,
    });

    assert.equal(hold.label, "Hold");
    assert.match(hold.detail, /close to a line/);
    assert.doesNotMatch(hold.detail, /fresh data|posture|policy/i);
  });

  it("caps readiness at caution when policy refusal is active", () => {
    const caution = buildDecisionReadinessState({
      confidenceLabel: "HIGH",
      freshnessState: {
        updatedAtLabel: "2026-03-01T00:00:00Z",
        freshnessStatus: "fresh",
        mode: "live",
        timestamp: "2026-03-01T00:00:00.000Z",
        ageHours: 1,
      },
      isFallbackSnapshot: false,
      policyRefusalActive: true,
      policyRefusalReasons: ["Composite disagreement exceeded threshold."],
    });

    assert.equal(caution.label, "Act with caution");
    assert.match(caution.detail, /The guidance is being held this week: Composite disagreement exceeded threshold\./);
    assert.doesNotMatch(caution.detail, /policy override|posture/i);
  });

});
