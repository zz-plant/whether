import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RegimeCommandBar } from "../app/components/RegimeCommandBar";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";

const reportDynamics: ReportDynamics = {
  directionLabel: "deteriorating",
  totalSignalChanges: 1,
  regimeChanged: false,
  changedSignals: [{ key: "tightness", label: "Cash tightness", delta: 2 }],
  anomalySignals: [],
};

describe("home route render contract", () => {
  it("keeps one primary weekly summary block above fold in the homepage decision stack", () => {
    // Route-level homepage contract: one command bar + one weekly summary block, no duplicate summaries.
    const html = renderToStaticMarkup(
      <>
        <RegimeCommandBar
          regime="DEFENSIVE"
          call="Stage approvals and protect runway."
          doNow={["Pause net-new fixed burn commitments this week."]}
          flipConditions={["Flip when tightness falls below 65 and holds."]}
          updatedAt="Mar 8, 2026"
        />
        <WeeklyDecisionCard
          statusLabel="DEFENSIVE"
          regimeKey="DEFENSIVE"
          postureLabel="Defensive"
          stageLabel="Watchful"
          postureWithStageLabel="Defensive — Watchful"
          postureDelta="Worse"
          confidenceLabel="MED"
          confidencePercent={68}
          signalConfidenceReason="Reason"
          regimeHeader={{ regime: "Defensive", confidence: "Medium", primaryRisk: "Boundary pressure" }}
          trendLabel="Deteriorating"
          confidenceHistory={[]}
          confidenceTrend="unstable"
          regimeSignalIndicators={[]}
          transitionWatch="ON"
          operatingStanceLine="Stage approvals and protect runway."
          weeklyMemoLines={["Signals tightened this week."]}
          netConstraintSummary="Pressure elevated"
          guardrail="Guardrail"
          reversalTrigger="Flip trigger"
          actionNowShort="Pause net-new fixed burn commitments this week."
          canonicalDecisionCopy={{
            currentRegimeLabel: "Defensive — Watchful",
            operatingCall: "Stage approvals and protect runway.",
            doNowLines: ["Pause net-new fixed burn commitments this week."],
            flipTrigger: "Flip when tightness falls below 65 and holds.",
            flipConditions: ["Tightness < 65"],
          }}
          recordDateLabel="Mar 7, 2026"
          fetchedAtLabel="Mar 8, 2026"
          reportDynamics={reportDynamics}
          decisionShiftSummary="delta"
          transitionProbabilities={{ Expansion: 10, Mixed: 20, Scarcity: 45, Defensive: 25 }}
          decisionRules={[]}
          roleAwareTemplates={[]}
          executiveOperationalStance={{ expand: ["Expand carefully"], avoid: ["Avoid fixed-cost expansion"] }}
          revisitDecisions={true}
          weeklyMovement={{ score: 1, direction: "defensive", summary: "Movement" }}
          memoryRail={[]}
          historicalTimeline={[]}
          historicalAnalogs={[]}
          macroOverlay={[]}
          whyThisCall={[]}
          evidenceItems={[]}
          startupClimateIndex={{ score: 63, status: "Improving", breakdown: [] }}
          regimeDistance={{
            dimensionLabel: "Tightness",
            currentValue: 68,
            thresholdValue: 70,
            pointsToFlip: 2,
            dimensionKey: "tightness",
            thresholdDirection: "riseAbove",
          }}
          regimeVelocity={{
            status: "ok",
            from: "Expansion",
            to: "Mixed",
            sampleSize: 3,
            lowerBoundMonths: 2,
            upperBoundMonths: 5,
            typicalRangeLabel: "2–5 months",
            displayLabel: "Expansion→Mixed typically 2–5 months",
          }}
          citation="Citation"
        />
      </>,
    );

    const summaryHeadings = html.match(/<h2[^>]*>Weekly call snapshot<\/h2>/g) ?? [];
    const canonicalOrders = html.match(/Weekly decision transmission order/g) ?? [];
    assert.equal(summaryHeadings.length, 1);
    assert.equal(canonicalOrders.length, 1);
  });
});
