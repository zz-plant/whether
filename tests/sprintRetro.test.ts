import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  auditSprintDecisions,
  DECISION_CATEGORY_TO_AREA,
  type SprintDecisionCandidate,
  type SprintRetroReport,
} from "../lib/report/sprintRetro";
import { buildDecisionMemoryEntry } from "../lib/decisionMemory";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";

describe("sprint retro violation report (T3.2)", () => {
  it("maps decision categories to canonical operating areas", () => {
    assert.equal(DECISION_CATEGORY_TO_AREA.HIRING, "hiring");
    assert.equal(DECISION_CATEGORY_TO_AREA.ROADMAP, "product-tempo");
    assert.equal(DECISION_CATEGORY_TO_AREA.INFRASTRUCTURE, "burn-discipline");
    assert.equal(DECISION_CATEGORY_TO_AREA.M_AND_A, "expansion-bets");
    assert.equal(DECISION_CATEGORY_TO_AREA.GEOGRAPHIC_EXPANSION, "expansion-bets");
  });

  it("returns zero violations when given an empty decision cohort", () => {
    const report: SprintRetroReport = auditSprintDecisions({
      decisions: [],
      regime: "DEFENSIVE",
      scores: { tightness: 50, riskAppetite: 50 },
    });

    assert.equal(report.totalDecisions, 0);
    assert.equal(report.violationCount, 0);
    assert.equal(report.compliantCount, 0);
    assert.equal(report.headline, "No decisions recorded for this sprint.");
  });

  it("identifies active pause lines when tightness exceeds pause threshold", () => {
    const report = auditSprintDecisions({
      decisions: [],
      regime: "DEFENSIVE",
      scores: { tightness: 78, riskAppetite: 52 },
    });

    assert.ok(report.activePauseTriggers.length > 0);
    const hiringTrigger = report.activePauseTriggers.find((t) => t.area === "hiring");
    assert.ok(hiringTrigger);
    assert.match(hiringTrigger.pauseVerb, /Pause net-new hiring/);
    assert.match(hiringTrigger.pauseCondition, /Funding pressure > 76/);
  });

  it("flags net-new hiring commitment as a violation when funding pressure pause line is crossed", () => {
    const candidates: SprintDecisionCandidate[] = [
      {
        id: "sprint-1-hire",
        title: "Hire 3 net-new backend engineers",
        category: "HIRING",
        action: "HIRE",
        department: "Engineering",
        owner: "@cto",
      },
    ];

    const report = auditSprintDecisions({
      decisions: candidates,
      regime: "DEFENSIVE",
      scores: { tightness: 78, riskAppetite: 52 },
    });

    assert.equal(report.totalDecisions, 1);
    assert.equal(report.violationCount, 1);
    assert.equal(report.compliantCount, 0);
    assert.equal(report.violations[0]?.area, "hiring");
    assert.match(report.violations[0]?.pauseCondition ?? "", /Funding pressure > 76/);
    assert.match(report.violations[0]?.avoidNowGuidance ?? "", /Don't add roles for capacity/);
    assert.match(report.headline, /1 of 1 sprint decision\(s\) crossed active pause triggers/);
  });

  it("passes compliant moves (e.g. divestiture or non-commitment actions) under defensive conditions", () => {
    const candidates: SprintDecisionCandidate[] = [
      {
        id: "sprint-1-divest",
        title: "Divest non-core tooling",
        category: "RESTRUCTURING",
        action: "DIVEST",
        department: "Operations",
      },
    ];

    const report = auditSprintDecisions({
      decisions: candidates,
      regime: "DEFENSIVE",
      scores: { tightness: 78, riskAppetite: 52 },
    });

    assert.equal(report.totalDecisions, 1);
    assert.equal(report.violationCount, 0);
    assert.equal(report.compliantCount, 1);
    assert.match(report.headline, /All 1 sprint decision\(s\) align/);
  });

  it("normalizes and audits DecisionMemoryEntry records from decision memory repository", () => {
    const memoryEntry = buildDecisionMemoryEntry({
      clientId: "client-acme",
      recordDate: "2026-10-12",
      department: "Product",
      owner: "@vp-product",
      decision: {
        lifecycle: "GROWTH",
        category: "GEOGRAPHIC_EXPANSION",
        action: "REGIONAL_EXPANSION",
        context: "Open new EMEA office",
      },
      outcome: {
        verdict: "DANGEROUS",
        summary: "Regional expansion pauses during defensive regime.",
        guardrail: "Hold until cash runway exceeds 24 months.",
        reversalTrigger: "tightness drops below 66",
      },
      assessment: {
        regime: "DEFENSIVE",
        scores: { tightness: 72, riskAppetite: 40, baseRate: 4.8, curveSlope: 0.1, baseRateUsed: "1M" },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    const report = auditSprintDecisions({
      decisions: [memoryEntry],
      regime: "DEFENSIVE",
      scores: { tightness: 72, riskAppetite: 40 },
    });

    assert.equal(report.totalDecisions, 1);
    assert.equal(report.violationCount, 1);
    assert.equal(report.violations[0]?.area, "expansion-bets");
    assert.match(report.markdown, /Commitments crossing pause lines/);
  });
});
