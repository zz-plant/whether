import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTrustStatus } from "../lib/report/trustStatus";

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
    assert.match(result.trustStatusLabel, /Data state: live Treasury feed/);
    assert.match(result.trustStatusDetail, /do now \/ hold \/ revisit/);
    assert.match(result.trustStatusAction, /If confidence drops/);
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
    assert.match(result.trustStatusLabel, /Data state: cached snapshot/);
    assert.match(result.trustStatusDetail, /keep today’s do now \/ hold \/ revisit path/);
    assert.match(result.trustStatusDetail, /Treasury API timeout/);
    assert.match(result.trustStatusAction, /If confidence is low, stage commitments/);
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
    assert.match(result.trustStatusLabel, /Data state: historical snapshot/);
    assert.match(result.trustStatusDetail, /retrospective only/);
    assert.match(result.trustStatusAction, /If confidence is low, switch to current data/);
  });
});
