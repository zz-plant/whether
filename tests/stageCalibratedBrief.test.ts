import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildWeeklyCallContract } from "../lib/report/weeklyCallContract";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { evaluateRegime } from "../lib/regimeEngine";
import {
  auditCohortDecisions,
  buildDecisionMemoryEntry,
} from "../lib/decisionMemory";

import type { TreasuryData } from "../lib/types";

const mockTreasury: TreasuryData = {
  record_date: "2026-08-31",
  fetched_at: "2026-08-31T09:00:00Z",
  source: "US Treasury",
  isLive: true,
  yields: {
    oneMonth: 5.2,
    threeMonth: 5.2,
    twoYear: 4.8,
    tenYear: 4.2,
  },
};

describe("Stage-Calibrated Decision Engine & WeeklyCallContract", () => {
  it("builds stage-scoped adjustments across all startup lifecycle stages", () => {
    const assessment = evaluateRegime(mockTreasury);

    const homeBriefModel = buildHomeBriefModel({
      assessment,
      treasury: mockTreasury,
      sensors: [],
      macroSeries: [],
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [],
      },
      actionNowShort: "Hold net-new hiring and require reversible commitments.",
      startItems: ["Audit cloud compute commitments"],
      stopItems: ["Hold net-new hiring"],
      regimeAlert: null,
    });

    const weeklyCall = buildWeeklyCallContract({
      assessment,
      homeBriefModel,
    });

    assert.ok(weeklyCall.stageScopedAdjustments, "WeeklyCallContract should contain stageScopedAdjustments");
    
    // Seed stage calibration
    const seed = weeklyCall.stageScopedAdjustments.seed;
    assert.equal(seed.mode, "seed");
    assert.equal(seed.label, "Seed");
    assert.ok(seed.actionNow.length > 0);
    assert.ok(seed.thresholdEmphasis.toLowerCase().includes("runway"));

    // Series A stage calibration
    const seriesA = weeklyCall.stageScopedAdjustments["series-a"];
    assert.equal(seriesA.mode, "series-a");
    assert.ok(seriesA.thresholdEmphasis.toLowerCase().includes("payback"));

    // Series B stage calibration
    const seriesB = weeklyCall.stageScopedAdjustments["series-b"];
    assert.equal(seriesB.mode, "series-b");
    assert.ok(seriesB.thresholdEmphasis.toLowerCase().includes("margin") || seriesB.thresholdEmphasis.toLowerCase().includes("efficiency"));

    // Bootstrapped stage calibration
    const bootstrapped = weeklyCall.stageScopedAdjustments.bootstrapped;
    assert.equal(bootstrapped.mode, "bootstrapped");
    assert.ok(bootstrapped.thresholdEmphasis.toLowerCase().includes("cash"));
  });

  it("audits cohort decision memory entries against live signals", () => {
    const assessment = evaluateRegime(mockTreasury);

    // Entry recorded when tightness was 60 and threshold was 70
    const entry1 = buildDecisionMemoryEntry({
      clientId: "test_client",
      department: "Engineering",
      owner: "David",
      recordDate: "2026-06-01",
      decision: {
        lifecycle: "DISCOVERY",
        category: "HIRING",
        action: "HIRE",
      },
      outcome: {
        summary: "Hire 2 engineers if tightness stays below 70",
        guardrail: "Pause if tightness > 70",
        reversalTrigger: "Tightness < 65",
        verdict: "SAFE",
      },
      assessment: {
        ...assessment,
        scores: { ...assessment.scores, tightness: 60, riskAppetite: 50 },
        thresholds: { ...assessment.thresholds, tightnessRegime: 70, riskAppetiteRegime: 45 },
      },
    });

    // Live signal tightness is now 75 (tightness moved beyond 70 threshold => WATCH)
    const auditResultsWatch = auditCohortDecisions([entry1], {
      tightness: 75,
      riskAppetite: 45,
    });

    assert.equal(auditResultsWatch.totalAudited, 1);
    assert.equal(auditResultsWatch.watch.length, 1);
    assert.equal(auditResultsWatch.watch[0].health.verdict, "WATCH");
    assert.ok(auditResultsWatch.watch[0].health.reason.length > 0);

    // Live signal tightness is 75 AND risk appetite fell to 30 (both moved => RECONSIDER)
    const auditResultsReconsider = auditCohortDecisions([entry1], {
      tightness: 75,
      riskAppetite: 30,
    });

    assert.equal(auditResultsReconsider.totalAudited, 1);
    assert.equal(auditResultsReconsider.reconsider.length, 1);
    assert.equal(auditResultsReconsider.reconsider[0].health.verdict, "RECONSIDER");
  });
});
