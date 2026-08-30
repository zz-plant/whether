import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildStakeholderBriefs } from "../lib/export/stakeholderBriefs";
import type { WeeklyOperatorBriefPayload } from "../lib/export/weeklyOperatorBrief";

const mockPayload: WeeklyOperatorBriefPayload = {
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
  customTeamNote: "Holding Q3 SF hiring open until board review",
};

describe("stakeholderBriefs", () => {
  it("synthesizes all 5 stakeholder roles with tailored content", () => {
    const briefs = buildStakeholderBriefs(mockPayload);

    assert.ok(briefs.board, "generates board memo");
    assert.ok(briefs.engineering, "generates engineering brief");
    assert.ok(briefs.sales, "generates sales policy");
    assert.ok(briefs.allHands, "generates all-hands message");
    assert.ok(briefs.cfo, "generates CFO directive");

    // Check Board memo properties
    assert.ok(briefs.board.plainText.includes("Executive Macro & Capital Posture Update"));
    assert.ok(briefs.board.plainText.includes("Defensive (Late Cycle)"));
    assert.ok(briefs.board.plainText.includes("Company Context: Holding Q3 SF hiring open until board review"));

    // Check Engineering brief properties
    assert.ok(briefs.engineering.plainText.includes("Engineering & Product Operational Brief"));
    assert.ok(briefs.engineering.plainText.includes("100% architectural reversibility"));

    // Check Sales policy properties
    assert.ok(briefs.sales.plainText.includes("GTM & Commercial Policy Update"));
    assert.ok(briefs.sales.plainText.includes("100% upfront annual cash collection"));

    // Check All-Hands message properties
    assert.ok(briefs.allHands.plainText.includes("Team Weekly Focus & Operating Call"));

    // Check CFO directive properties
    assert.ok(briefs.cfo.plainText.includes("Finance & Treasury Control Directive"));
  });
});
