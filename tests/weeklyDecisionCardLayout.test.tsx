import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";

const reportDynamics: ReportDynamics = {
  directionLabel: "deteriorating",
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
    recommendation: "Keep discretionary spend gated to retention and reliability initiatives.",
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
        confidencePercent={68}
        trendLabel="Improving"
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
        historicalTimeline={[
          { label: "2020", posture: "Defensive" },
          { label: "2021", posture: "Expansion" },
          { label: "2022", posture: "Defensive" },
          { label: "2023", posture: "Mixed" },
          { label: "2024", posture: "Mixed" },
          { label: "2025", posture: "Expansion" },
          { label: "2026", posture: "Defensive" },
        ]}
        macroOverlay={[
          { label: "VC funding", detail: "-4.5 · ↑ improving" },
          { label: "Startup layoffs", detail: "62.0 · ↑ improving" },
          { label: "IPO window (VIX)", detail: "17.4 · ↓ tightening" },
          { label: "SaaS multiples", detail: "5.9 · ↑ improving" },
        ]}
        whyThisCall={[
          { label: "Boundary distance", detail: "Nearest boundary is 4.0 points away." },
          { label: "Momentum", detail: "Capital tightness tightened this week." },
          { label: "Reliability", detail: "Transition watch is ON." },
        ]}
        primaryDrivers={[
          { label: "Capital tightness", detail: "↑ tightened this week" },
          { label: "Risk appetite", detail: "↓ eased this week" },
          { label: "Signal reliability", detail: "Medium confidence" },
        ]}
        startupClimateIndex={{
          score: 63,
          status: "Improving",
          breakdown: [
            { label: "Capital availability", score: 71 },
            { label: "Hiring market", score: 56 },
            { label: "SaaS valuations", score: 60 },
            { label: "IPO window", score: 47 },
          ],
        }}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 64,
          thresholdValue: 70,
          pointsToFlip: 6,
        }}
        citation="Whether weekly brief citation"
        actions={<button type="button">Copy weekly brief</button>}
      />,
    );

    const postureIndex = html.indexOf("Weekly posture call");
    const decisionCallIndex = html.indexOf("Decision call this week");
    const rulesSummaryIndex = html.indexOf("Bounded rules (do now / stop / restart)");

    assert.ok(postureIndex >= 0);
    assert.ok(decisionCallIndex > postureIndex);
    assert.ok(rulesSummaryIndex > decisionCallIndex);
    assert.match(html, /Do now: revise hiring and roadmap decisions this week\./);
    assert.match(html, /aria-label="Weekly trust signals"/);
    assert.match(html, /Confidence 68% \(MED\)/);
    assert.match(html, /Trend Improving/);
    assert.match(html, /Confidence MED · Freshness Mar 6, 2026 09:12 UTC · Regime shift watch ON/);
    assert.match(html, /Decision call this week/);
    assert.match(html, /What changed/);
    assert.match(html, /Decision now[\s\S]*Revise hiring and roadmap calls now\./);
    assert.match(html, /Flip if/);
    assert.match(html, /Restart when/);
    assert.match(html, /Macro drift this week/);
    assert.match(html, /Distance to regime flip/);
    assert.match(html, /Decision change pressure/);
    assert.match(html, /Decision matrix this week/);
    assert.match(html, /<p class="font-semibold text-rose-200">High<\/p>/);
    assert.match(html, /<p class="font-semibold text-amber-200">Controlled<\/p>/);
    assert.match(html, /<p class="font-semibold text-emerald-200">Low<\/p>/);
    assert.match(html, /Bounded rules \(do now \/ stop \/ restart\)/);
    assert.match(html, /Primary drivers this week/);
    assert.match(html, /Startup Climate Index/);
    assert.match(html, /Score 63 \/ 100 · Improving/);
    assert.match(html, /Why this posture call/);
    assert.match(html, /Stop if:/);
    assert.match(html, /Restart when:/);
    assert.match(html, /Team context check/);
    assert.match(html, /Run risk check/);
  });

  it("uses responsive classes to protect screenshot readability and keeps citation actions", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="BALANCED"
        postureDelta="+0"
        confidenceLabel="HIGH"
        confidencePercent={82}
        trendLabel="Stable"
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
        historicalTimeline={[
          { label: "2020", posture: "Defensive" },
          { label: "2021", posture: "Expansion" },
          { label: "2022", posture: "Defensive" },
          { label: "2023", posture: "Mixed" },
          { label: "2024", posture: "Mixed" },
          { label: "2025", posture: "Expansion" },
          { label: "2026", posture: "Balanced" },
        ]}
        macroOverlay={[
          { label: "VC funding", detail: "-4.5 · ↑ improving" },
          { label: "Startup layoffs", detail: "62.0 · ↑ improving" },
          { label: "IPO window (VIX)", detail: "17.4 · ↓ tightening" },
          { label: "SaaS multiples", detail: "5.9 · ↑ improving" },
        ]}
        whyThisCall={[
          { label: "Boundary distance", detail: "Nearest boundary is 15.0 points away." },
          { label: "Momentum", detail: "No material deltas this week." },
          { label: "Reliability", detail: "Transition watch is OFF." },
        ]}
        primaryDrivers={[
          { label: "Signal reliability", detail: "High confidence" },
          { label: "Transition watch", detail: "OFF" },
        ]}
        startupClimateIndex={{
          score: 74,
          status: "Stable",
          breakdown: [
            { label: "Capital availability", score: 72 },
            { label: "Hiring market", score: 69 },
            { label: "SaaS valuations", score: 77 },
            { label: "IPO window", score: 78 },
          ],
        }}
        regimeDistance={{
          dimensionLabel: "Risk appetite",
          currentValue: 48,
          thresholdValue: 52,
          pointsToFlip: -4,
        }}
        citation="Whether weekly brief citation"
        actions={<button type="button">Copy board summary</button>}
      />,
    );

    assert.match(html, /data-testid="weekly-top-fold"/);
    assert.match(html, /sm:grid-cols-4/);
    assert.match(html, /lg:grid-cols-5/);
    assert.match(html, /Historical memory rail/);
    assert.match(html, /More context \(why this call \+ timeline\)/);
    assert.match(html, /Cite this call/);
    assert.match(html, /Posture BALANCED · Confidence HIGH · Effective Mar 5, 2026 · Freshness Mar 6, 2026 09:12 UTC/);
    assert.match(html, /Whether weekly brief citation/);
    assert.match(html, /Copy board summary/);
  });

  it("renders fallback trust freshness label when freshness text is empty", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        postureDelta="No worse than last week"
        confidenceLabel="LOW"
        confidencePercent={44}
        trendLabel="Mixed"
        transitionWatch="ON"
        netConstraintSummary="Fallback snapshot is currently in use."
        guardrail="Hold non-core hiring."
        reversalTrigger="If risk appetite improves, reopen selective requests."
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel=""
        reportDynamics={{ directionLabel: "stable", changedSignals: [] }}
        decisionShiftSummary="Decision delta: no material shift. Keep last week’s operating calls."
        decisionRules={decisionRules}
        revisitDecisions={false}
        memoryRail={[
          { label: "W-3", posture: "Defensive" },
          { label: "W-2", posture: "Defensive" },
          { label: "W-1", posture: "Defensive" },
          { label: "Now", posture: "Defensive" },
        ]}
        historicalTimeline={[
          { label: "2020", posture: "Defensive" },
          { label: "2021", posture: "Expansion" },
          { label: "2022", posture: "Defensive" },
          { label: "2023", posture: "Mixed" },
          { label: "2024", posture: "Mixed" },
          { label: "2025", posture: "Expansion" },
          { label: "2026", posture: "Defensive" },
        ]}
        macroOverlay={[
          { label: "VC funding", detail: "-4.5 · ↑ improving" },
          { label: "Startup layoffs", detail: "62.0 · ↑ improving" },
          { label: "IPO window (VIX)", detail: "17.4 · ↓ tightening" },
          { label: "SaaS multiples", detail: "5.9 · ↑ improving" },
        ]}
        whyThisCall={[
          { label: "Boundary distance", detail: "Nearest boundary is 2.0 points away." },
          { label: "Momentum", detail: "No material deltas this week." },
          { label: "Reliability", detail: "Transition watch is ON." },
        ]}
        primaryDrivers={[
          { label: "Signal reliability", detail: "Low confidence" },
          { label: "Transition watch", detail: "ON" },
        ]}
        startupClimateIndex={{
          score: 42,
          status: "Deteriorating",
          breakdown: [
            { label: "Capital availability", score: 39 },
            { label: "Hiring market", score: 45 },
            { label: "SaaS valuations", score: 43 },
            { label: "IPO window", score: 41 },
          ],
        }}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 68,
          thresholdValue: 70,
          pointsToFlip: 2,
        }}
        citation="Whether weekly brief citation"
      />,
    );

    assert.match(html, /Confidence LOW · Freshness Unavailable · Regime shift watch ON/);
    assert.match(html, /Posture DEFENSIVE · Confidence LOW · Effective Mar 5, 2026 · Freshness Unavailable/);
    assert.match(html, /Use this call for near-term pacing only until confidence returns to HIGH with fresh data\./);
  });

  it("shows pacing warning for cached fallback snapshots even with high confidence and a timestamp", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        postureDelta="No worse than last week"
        confidenceLabel="HIGH"
        confidencePercent={92}
        trendLabel="Stable"
        transitionWatch="OFF"
        netConstraintSummary="Fallback snapshot is stable for near-term pacing."
        guardrail="Hold irreversible hiring unless demand proves durable."
        reversalTrigger="If tightness drops below 60, reopen selective hiring."
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026 09:12 UTC"
        reportDynamics={{ directionLabel: "stable", changedSignals: [] }}
        decisionShiftSummary="No material signal shift in fallback mode."
        decisionRules={decisionRules}
        revisitDecisions={false}
        memoryRail={[
          { label: "W-3", posture: "Defensive" },
          { label: "W-2", posture: "Defensive" },
          { label: "W-1", posture: "Defensive" },
          { label: "Now", posture: "Defensive" },
        ]}
        historicalTimeline={[
          { label: "2020", posture: "Defensive" },
          { label: "2021", posture: "Expansion" },
          { label: "2022", posture: "Defensive" },
          { label: "2023", posture: "Mixed" },
          { label: "2024", posture: "Mixed" },
          { label: "2025", posture: "Expansion" },
          { label: "2026", posture: "Defensive" },
        ]}
        macroOverlay={[
          { label: "VC funding", detail: "-4.5 · ↑ improving" },
          { label: "Startup layoffs", detail: "62.0 · ↑ improving" },
          { label: "IPO window (VIX)", detail: "17.4 · ↓ tightening" },
          { label: "SaaS multiples", detail: "5.9 · ↑ improving" },
        ]}
        whyThisCall={[
          { label: "Boundary distance", detail: "Nearest boundary is 6.0 points away." },
          { label: "Momentum", detail: "No material deltas this week." },
          { label: "Reliability", detail: "Fallback snapshot in use." },
        ]}
        primaryDrivers={[
          { label: "Signal reliability", detail: "High confidence (cached snapshot)" },
          { label: "Transition watch", detail: "OFF" },
        ]}
        startupClimateIndex={{
          score: 61,
          status: "Stable",
          breakdown: [
            { label: "Capital availability", score: 64 },
            { label: "Hiring market", score: 57 },
            { label: "SaaS valuations", score: 62 },
            { label: "IPO window", score: 54 },
          ],
        }}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 64,
          thresholdValue: 70,
          pointsToFlip: 6,
        }}
        citation="Whether weekly brief citation"
        isFallbackSnapshot={true}
      />,
    );

    assert.match(html, /Confidence 92% \(HIGH\)/);
    assert.match(html, /Freshness Mar 6, 2026 09:12 UTC/);
    assert.match(html, /Using a cached snapshot\. Use this call for near-term pacing only and pause irreversible decisions until live refresh returns\./);
  });
});
