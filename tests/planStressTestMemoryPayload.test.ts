import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { POST as postDecisionMemoryRoute } from "../app/api/decision-memory/route";
import { buildPlanStressTestMemoryPayload, parseDecisionMemoryEntry } from "../lib/decisionMemory";
import { stressTestDecisionPlan } from "../lib/decisionShield";
import { evaluateRegime } from "../lib/regimeEngine";
import { resetDecisionMemoryRepository } from "../lib/storage/decisionMemoryRepository";
import type { TreasuryData } from "../lib/types";

const treasury: TreasuryData = {
  record_date: "2026-08-31",
  fetched_at: "2026-08-31T09:00:00Z",
  source: "US Treasury",
  isLive: true,
  yields: { oneMonth: 5.2, threeMonth: 5.2, twoYear: 4.8, tenYear: 4.2 },
};

describe("plan stress test → decision memory", () => {
  beforeEach(() => {
    resetDecisionMemoryRepository();
  });

  it("posts a payload the decision-memory route accepts, carrying the sentence that was graded", async () => {
    const assessment = evaluateRegime(treasury);
    const planText = "Hire 3 senior engineers @ $180k";
    const result = stressTestDecisionPlan(assessment, {
      planText,
      lifecycle: "GROWTH",
      companyProfile: { runwayMonths: 14, monthlyBurnUsd: 150_000 },
    });
    const payload = buildPlanStressTestMemoryPayload({
      clientId: "client-stress",
      recordDate: "2026-08-31",
      planText,
      lifecycle: "GROWTH",
      result,
      assessment,
    });

    // The old payload (`kind: "plan-evaluation"`) drew a 400 here and the button
    // said "Tracked in Memory" anyway. This is the regression test for that.
    const response = await postDecisionMemoryRoute(new Request("http://localhost/api/decision-memory", {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-client-id": "client-stress" },
      body: JSON.stringify(payload),
    }));
    assert.equal(response.status, 200);
    const body: { created?: unknown; entry?: unknown } = await response.json();
    assert.equal(body.created, true);
    const entry = parseDecisionMemoryEntry(body.entry);
    assert.ok(entry, "the route answers with an entry the client parser accepts");
    assert.equal(entry.kind, "decision");
    assert.equal(entry.decision?.context, planText);
    assert.equal(entry.decision?.category, "HIRING");
    assert.equal(entry.outcome.verdict, result.verdict);
    assert.ok(entry.assumptions, "the entry carries the assumption snapshot the staleness panel reads");
  });
});
