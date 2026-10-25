import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCompactTrustSummary,
  buildDecisionReadinessState,
  buildTrustStatus,
} from "../lib/report/trustStatus";
import { buildCompactFreshnessMeta } from "../lib/report/reportFormatting";
import { DECISION_CONTRACT_LABELS, POLICY_OVERRIDE_CALL, type PolicyHoldCall } from "../lib/report/reportCopy";

describe("buildTrustStatus trust tones", () => {
  it("holds irreversible commitments near a change line even when live sources answered", () => {
    const result = buildTrustStatus({
      historicalSelection: false,
      isFallback: false,
      confidenceLabel: "LOW",
      freshnessLabel: "Updated 1h ago",
      historicalAction: "unused",
      fallbackAction: "unused",
      stableAction: "None.",
    });
    assert.equal(result.trustStatusTone, "warning");
    assert.match(result.trustStatusAction, /Hold irreversible commitments/);
    assert.match(result.decisionImpactWindow, /close to a change line/);
    assert.notEqual(result.trustStatusAction, "None.");
  });
  /* Live data adds nothing to the guidance, so the stable copy says so and no
     more: an approval instruction here read as the week's action under
     guidance to freeze (tests/pageReaderContradictions.test.tsx). */
  it("returns stable trust copy that describes the data and adds no action", () => {
    const result = buildTrustStatus({
      historicalSelection: false,
      isFallback: false,
      historicalAction: "unused",
      fallbackAction: "unused",
      stableAction: "None.",
    });

    assert.equal(result.trustStatusTone, "stable");
    assert.match(result.trustStatusLabel, /Live · all sources answered/);
    assert.equal(result.trustStatusDetail, "Every source answered, so this week's guidance rests on current data.");
    assert.equal(result.trustStatusAction, "None.");
    assert.equal(result.outageType, "live-data");
    assert.equal(result.outageSeverity, "advisory");
    assert.equal(result.outageExitGate.metCount, 2);
    assert.equal(
      result.decisionImpactWindow,
      "Use this live reading for this week's decisions; the pause lines in this week's guidance apply.",
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

  it("returns policy-refusal trust copy that holds approvals and states the reason it is held for", () => {
    const build = (policyHold: PolicyHoldCall) =>
      buildTrustStatus({
        historicalSelection: false,
        isFallback: false,
        historicalAction: "unused",
        fallbackAction: "unused",
        stableAction: "unused",
        policyHold,
      });

    const disagree = build(POLICY_OVERRIDE_CALL["signals-disagree"]);
    assert.equal(disagree.trustStatusTone, "warning");
    assert.equal(disagree.trustStatusLabel, "Live data, but guidance held");
    assert.match(disagree.trustStatusDetail, /The two scores point in different directions, so the guidance is not changing this week/);
    assert.match(disagree.trustStatusAction, /Keep new commitments reversible\./);
    assert.ok(disagree.trustStatusAction.includes(`${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: the two scores agree.`));
    assert.equal(disagree.decisionImpactWindow, "Only moves you can undo, until the two scores agree.");

    /* A week held for missing inputs printed "the two scores point in different
       directions" here, and "signals unstable" above it. */
    const missing = build(POLICY_OVERRIDE_CALL["inputs-missing"]);
    assert.match(missing.trustStatusDetail, /^Too many inputs are missing this week/);
    assert.ok(missing.trustStatusAction.includes(`${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: the missing inputs return.`));
    for (const text of [missing.trustStatusLabel, missing.trustStatusDetail, missing.trustStatusAction, missing.decisionImpactWindow]) {
      assert.doesNotMatch(text, /two scores|unstable/, text);
    }
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
      policyHold: POLICY_OVERRIDE_CALL["signals-dispersed"],
    });

    assert.equal(caution.label, "Act with caution");
    assert.equal(caution.detail, `${POLICY_OVERRIDE_CALL["signals-dispersed"].currentCall} Keep new commitments reversible.`);
    assert.doesNotMatch(caution.detail, /policy override|posture|two scores/i);
  });

  /* Missing inputs lower the confidence too, so a week held for them is LOW, and
     the low-confidence branch said only that conditions sat close to a line. */
  it("holds on low confidence in the words of the reason a held week is held", () => {
    const held = buildDecisionReadinessState({
      confidenceLabel: "LOW",
      freshnessLabel: "Updated 1h ago",
      isFallbackSnapshot: false,
      policyHold: POLICY_OVERRIDE_CALL["inputs-missing"],
    });

    assert.equal(held.label, "Hold");
    assert.ok(held.detail.startsWith(POLICY_OVERRIDE_CALL["inputs-missing"].currentCall), held.detail);
    assert.doesNotMatch(held.detail, /close to a line/);
  });

});
