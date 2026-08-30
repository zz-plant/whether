import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  dispatchWeeklyBriefSlackWebhook,
  dispatchAssumptionAlertSlackWebhook,
} from "../lib/webhooks/slackWebhookDelivery";
import type { WeeklyOperatorBriefPayload } from "../lib/export/weeklyOperatorBrief";
import type { DecisionMemoryEntry } from "../lib/decisionMemory";

const mockBriefPayload: WeeklyOperatorBriefPayload = {
  date: "2026-08-28",
  regimeStage: "Defensive (Late Cycle)",
  confidence: "High",
  currentCall: "Hold fixed commitments; prioritize core retention",
  actionNow: "Gate all net-new headcount to revenue-backed roles",
  pauseIf: "Funding pressure exceeds 75/100",
  changeCourseIf: "Risk appetite clears 50 for two consecutive reads",
  doNowBullets: ["Audit vendor spend", "Freeze outbound expansion"],
  whyCouldBeWrong: "Unexpected rate cuts could accelerate enterprise demand",
  flipTrigger: "Yield curve turns positive",
  flipConditionLabels: ["Yield curve slope > 0.00%"],
};

const mockDecisionEntry: DecisionMemoryEntry = {
  id: "dec-101",
  createdAt: "2026-08-01T00:00:00.000Z",
  kind: "decision",
  context: {
    clientId: "client-1",
    teamId: "team-acme",
    recordDate: "2026-08-01",
  },
  outcome: {
    verdict: "RISKY",
    summary: "Q3 Engineering Hiring",
    guardrail: "Cap at 2 reqs",
    reversalTrigger: "Risk appetite >= 50",
  },
  regime: {
    label: "DEFENSIVE",
    scores: { tightness: 60, riskAppetite: 55 },
  },
  sources: ["https://fred.stlouisfed.org"],
};

describe("slackWebhookDelivery", () => {
  it("dispatches weekly brief to Slack webhook successfully", async () => {
    let capturedBody: any = null;
    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const result = await dispatchWeeklyBriefSlackWebhook(mockBriefPayload, {
      webhookUrl: "https://hooks.slack.com/services/test/123",
      fetchFn: mockFetch as any,
    });

    assert.equal(result.ok, true);
    assert.equal(result.statusCode, 200);
    assert.ok(capturedBody.text.includes("Whether Weekly Brief"));
    assert.ok(Array.isArray(capturedBody.blocks));
  });

  it("dispatches assumption break alert when decision flips to RECONSIDER", async () => {
    let capturedBody: any = null;
    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const result = await dispatchAssumptionAlertSlackWebhook(
      {
        decision: mockDecisionEntry,
        verdict: "RECONSIDER",
        reason: "Funding pressure rose +12.0 pts since baseline approval.",
        currentRecordDate: "2026-08-28",
      },
      {
        webhookUrl: "https://hooks.slack.com/services/test/123",
        fetchFn: mockFetch as any,
      }
    );

    assert.equal(result.ok, true);
    assert.equal(result.statusCode, 200);
    assert.ok(capturedBody.text.includes("RECONSIDER"));
    assert.ok(capturedBody.text.includes("Q3 Engineering Hiring"));
  });
});
