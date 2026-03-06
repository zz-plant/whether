import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";

const reportDynamics: ReportDynamics = {
  directionLabel: "tightening",
  changedSignals: [
    { key: "tightness", delta: 3 },
    { key: "riskAppetite", delta: -2 },
  ],
};

const decisionRules: BoundedDecisionRule[] = [
  {
    area: "hiring",
    recommendation: "Keep backfills only.",
    scope: "New headcount requires CFO review.",
    pauseTrigger: "Pause when tightness rises above 74.",
    resumeTrigger: "Resume when tightness falls below 65.",
    rationale: "Preserve fixed-cost discipline under pressure.",
  },
  {
    area: "burn-discipline",
    recommendation: "Prioritize retention and reliability spend.",
    scope: "Cap non-core experiments to 10%.",
    pauseTrigger: "Pause expansion experiments if risk appetite drops below 44.",
    resumeTrigger: "Resume when risk appetite reaches 52.",
    rationale: "Keep spend pointed at measurable efficiency outcomes.",
  },
  {
    area: "product-tempo",
    recommendation: "Favor milestone-based sequencing.",
    scope: "Require payoff in ≤12 months.",
    pauseTrigger: "Pause net-new platform bets when base rate exceeds 5.4.",
    resumeTrigger: "Resume when base rate is below 4.9.",
    rationale: "Speed up only when financing conditions support it.",
  },
  {
    area: "expansion-bets",
    recommendation: "Protect conversion before expansion.",
    scope: "Limit channel pilots to one at a time.",
    pauseTrigger: "Pause pilots if curve slope turns negative for two weeks.",
    resumeTrigger: "Resume after two positive slope reads.",
    rationale: "Scale expansion bets only after conditions stabilize.",
  },
];

describe("WeeklyDecisionCard top-fold composition", () => {
  it("renders canonical top-fold hierarchy in order", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        postureDelta="+2"
        confidenceLabel="MED"
        transitionWatch="ON"
        netConstraintSummary="Pressure remains elevated but stabilizing."
        guardrail="Hold irreversible hiring unless direct revenue impact is clear."
        reversalTrigger="If risk appetite rises above 55, reopen selective hiring."
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026 09:12 UTC"
        reportDynamics={reportDynamics}
        decisionShiftSummary="Decision delta: tighten roadmap optionality while protecting core delivery."
        decisionRules={decisionRules}
        revisitDecisions={true}
        memoryRail={[
          { label: "W-3", posture: "Defensive" },
          { label: "W-2", posture: "Defensive" },
          { label: "W-1", posture: "Balanced" },
          { label: "Now", posture: "Defensive" },
        ]}
        citation="Whether weekly brief citation"
        actions={<button type="button">Copy weekly brief</button>}
      />,
    );

    const postureIndex = html.indexOf("This week&#x27;s posture");
    const deltaIndex = html.indexOf("Decision delta this week");
    const revisitIndex = html.indexOf("Revisit implications");
    const rulesSummaryIndex = html.indexOf("Decision rules summary");

    assert.ok(postureIndex >= 0);
    assert.ok(deltaIndex > postureIndex);
    assert.ok(revisitIndex > deltaIndex);
    assert.ok(rulesSummaryIndex > revisitIndex);
  });

  it("uses responsive classes to protect screenshot readability and keeps citation actions", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="BALANCED"
        postureDelta="+0"
        confidenceLabel="HIGH"
        transitionWatch="OFF"
        netConstraintSummary="No material operating change this week."
        guardrail="Keep fixed-cost expansion on hold."
        reversalTrigger="If tightness drops below 60, reopen expansion motions."
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026 09:12 UTC"
        reportDynamics={{ directionLabel: "stable", changedSignals: [] }}
        decisionShiftSummary="Decision delta: no material shift; hold current operating posture."
        decisionRules={decisionRules}
        revisitDecisions={false}
        memoryRail={[
          { label: "W-3", posture: "Balanced" },
          { label: "W-2", posture: "Balanced" },
          { label: "W-1", posture: "Balanced" },
          { label: "Now", posture: "Balanced" },
        ]}
        citation="Whether weekly brief citation"
        actions={<button type="button">Copy board summary</button>}
      />,
    );

    assert.match(html, /data-testid="weekly-top-fold"/);
    assert.match(html, /lg:grid-cols-12/);
    assert.match(html, /lg:col-span-6/);
    assert.match(html, /lg:grid-cols-4/);
    assert.match(html, /Cite this call/);
    assert.match(html, /Copy board summary/);
  });
});
