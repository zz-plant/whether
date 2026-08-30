import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildDecisionMemoryEntry,
  toDecisionMemoryCsv,
  evaluateDecisionAssumptionHealth,
} from "../lib/decisionMemory";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngine";

describe("decisionMemory", () => {
  it("builds entries with deduplicated source URLs and assigns department, owner, teamId", () => {
    const entry = buildDecisionMemoryEntry({
      clientId: "client-1",
      teamId: "team-acme",
      department: "Engineering",
      owner: "@sarah",
      recordDate: "2026-02-16",
      decision: {
        lifecycle: "GROWTH",
        category: "HIRING",
        action: "HIRE",
      },
      outcome: {
        verdict: "RISKY",
        summary: "Hiring remains constrained.",
        guardrail: "Require revenue-backed roles first.",
        reversalTrigger: "tightness drops below 70",
      },
      assessment: {
        regime: "DEFENSIVE",
        scores: {
          tightness: 72,
          riskAppetite: 52,
          baseRate: 5.2,
          curveSlope: 0.2,
          baseRateUsed: "1M",
        },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [
          {
            id: "base-rate",
            label: "1M",
            value: 5.2,
            unit: "%",
            sourceLabel: "Treasury",
            sourceUrl: "https://example.com/treasury",
            recordDate: "2026-02-16",
            fetchedAt: "2026-02-16T00:00:00.000Z",
          },
          {
            id: "two-year",
            label: "3M",
            value: 5.1,
            unit: "%",
            sourceLabel: "Treasury",
            sourceUrl: "https://example.com/treasury",
            recordDate: "2026-02-16",
            fetchedAt: "2026-02-16T00:00:00.000Z",
          },
          {
            id: "ten-year",
            label: "10Y",
            value: 4.3,
            unit: "%",
            sourceLabel: "FRED",
            sourceUrl: "https://example.com/fred",
            recordDate: "2026-02-16",
            fetchedAt: "2026-02-16T00:00:00.000Z",
          },
        ],
      },
    });

    assert.equal(entry.context.clientId, "client-1");
    assert.equal(entry.context.teamId, "team-acme");
    assert.equal(entry.department, "Engineering");
    assert.equal(entry.owner, "@sarah");
    assert.deepEqual(entry.sources, ["https://example.com/treasury", "https://example.com/fred"]);
  });

  it("serializes entries to CSV", () => {
    const csv = toDecisionMemoryCsv([
      {
        id: "id-1",
        createdAt: "2026-02-16T00:00:00.000Z",
        context: {
          clientId: "client-1",
          recordDate: "2026-02-16",
        },
        decision: {
          lifecycle: "SCALE",
          category: "PRICING",
          action: "DISCOUNT",
        },
        outcome: {
          verdict: "DANGEROUS",
          summary: "Discounting under scarcity can compress runway.",
          guardrail: "Only run targeted discount tests.",
          reversalTrigger: "risk appetite rises above 60",
        },
        regime: {
          label: "SCARCITY",
          scores: {
            tightness: 88,
            riskAppetite: 40,
            baseRate: 5.8,
            curveSlope: -0.2,
            baseRateUsed: "1M",
          },
          thresholds: DEFAULT_THRESHOLDS,
        },
        sources: ["https://example.com/source"],
      },
    ]);

    assert.match(csv, /"id"/);
    assert.match(csv, /"SCARCITY"/);
    assert.match(csv, /"https:\/\/example.com\/source"/);
  });

  it("evaluates decision assumption health with RECONSIDER, WATCH, and STAND verdicts", () => {
    const baseEntry = buildDecisionMemoryEntry({
      clientId: "client-1",
      recordDate: "2026-02-16",
      decision: {
        lifecycle: "GROWTH",
        category: "HIRING",
        action: "HIRE",
      },
      outcome: {
        verdict: "SAFE",
        summary: "Plan approved under moderate conditions.",
        guardrail: "Maintain 18m runway buffer.",
        reversalTrigger: "tightness increases by 10 points",
      },
      assessment: {
        regime: "DEFENSIVE",
        scores: {
          tightness: 65,
          riskAppetite: 55,
          baseRate: 4.8,
          curveSlope: 0.1,
          baseRateUsed: "1M",
        },
        thresholds: DEFAULT_THRESHOLDS,
        inputs: [],
      },
    });

    // 1. Unchanged conditions -> STAND
    const standResult = evaluateDecisionAssumptionHealth({
      entry: baseEntry,
      currentTightness: 66,
      currentRiskAppetite: 54,
    });
    assert.equal(standResult.verdict, "STAND");

    // 2. Mild movement (tightness +6) -> WATCH
    const watchResult = evaluateDecisionAssumptionHealth({
      entry: baseEntry,
      currentTightness: 71,
      currentRiskAppetite: 55,
    });
    assert.equal(watchResult.verdict, "WATCH");

    // 3. Significant deterioration (tightness +12, risk appetite -12) -> RECONSIDER
    const reconsiderResult = evaluateDecisionAssumptionHealth({
      entry: baseEntry,
      currentTightness: 77,
      currentRiskAppetite: 43,
    });
    assert.equal(reconsiderResult.verdict, "RECONSIDER");
    assert.match(reconsiderResult.reason, /Capital conditions and demand expectations have weakened/);
  });
});

