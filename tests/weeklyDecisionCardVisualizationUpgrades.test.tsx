import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MoreContextDisclosureBody, WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import { ActionStripSection } from "../app/components/weekly-card/ActionStripSection";
import { buildWeeklyDecisionPresentation } from "../app/components/weekly-card/presentationAdapter";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

describe("WeeklyDecisionCard visualization upgrades", () => {
  it("renders the tighter confidence comparison block in the weekly brief", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        model={buildWeeklyDecisionCardModel({
          status: {
            confidenceHistory: [
              { recordDate: "2026-02-13", confidencePercent: 60, isMissing: false },
              { recordDate: "2026-02-20", confidencePercent: null, isMissing: true },
              { recordDate: "2026-02-27", confidencePercent: 72, isMissing: false },
            ],
            confidenceTrend: "unstable",
          },
        })}
      />,
    );

    assert.match(html, /Confidence check/);
    assert.match(html, /Last read -&gt; This week -&gt; Threshold/);
    assert.match(html, /1 missing week in the 8-week window\./);
    assert.match(html, /Read continuity/);
    assert.match(html, /missing confidence read/);
  });

  it("ranks driver highlights by contribution before raw delta order", () => {
    const presentation = buildWeeklyDecisionPresentation({
      model: buildWeeklyDecisionCardModel({
        decision: {
          reportDynamics: {
            directionLabel: "mixed",
            totalSignalChanges: 3,
            regimeChanged: false,
            changedSignals: [
              { key: "tightness", label: "Capital tightness", delta: 6 },
              { key: "riskAppetite", label: "Risk appetite", delta: -2 },
              { key: "curveSlope", label: "Yield curve slope", delta: -0.2 },
            ],
            anomalySignals: [],
            signalContributions: [
              { key: "riskAppetite", label: "Risk appetite", influence: 0.52, normalized: 0.52, normalizedPercentLabel: "52%" },
              { key: "tightness", label: "Capital tightness", influence: 0.31, normalized: 0.31, normalizedPercentLabel: "31%" },
              { key: "curveSlope", label: "Yield curve slope", influence: 0.17, normalized: 0.17, normalizedPercentLabel: "17%" },
            ],
          },
        },
        diagnostics: {
          evidenceItems: [
            {
              key: "riskAppetite",
              title: "Risk appetite",
              supportingBullets: ["Deal appetite softened."],
              confidenceLabel: "Medium",
              directionLabel: "Tightening",
              immediateImplication: "Bias toward proof-first launches and smaller bet sizes.",
            },
            {
              key: "tightness",
              title: "Capital tightness",
              supportingBullets: ["Financing pressure increased."],
              confidenceLabel: "Medium",
              directionLabel: "Tightening",
              immediateImplication: "Keep fixed-cost approvals gated.",
            },
          ],
        },
      }),
    });

    assert.equal(presentation.driverHighlights[0]?.label, "Risk appetite");
    assert.equal(presentation.driverHighlights[0]?.weightLabel, "52% posture weight");
    assert.match(presentation.driverHighlights[0]?.deltaLabel ?? "", /-2\.0 vs last week/);
    assert.equal(presentation.driverHighlights[0]?.postureDirectionLabel, "Tightening posture");
  });

  it("builds a compact posture trajectory strip from recent weekly history", () => {
    const presentation = buildWeeklyDecisionPresentation({
      model: buildWeeklyDecisionCardModel({
        history: {
          memoryRail: [
            { label: "Mar 21, 2026", posture: "Volatile" },
            { label: "Mar 28, 2026", posture: "Mixed" },
            { label: "Apr 4, 2026", posture: "Defensive" },
          ],
        },
        diagnostics: {
          postureTrajectory: {
            current: { tightness: 64, riskAppetite: 52 },
            previous: { tightness: 62, riskAppetite: 56 },
            weeklyDelta: { tightness: 2, riskAppetite: -4 },
            thresholds: { tightness: 70, riskAppetite: 50 },
          },
        },
      }),
    });

    assert.deepEqual(
      presentation.postureSteps.map((step) => step.label),
      ["Prior", "Last week", "This week"],
    );
    assert.equal(presentation.postureSteps[2]?.posture, "Defensive");
    assert.equal(presentation.trajectoryDeltaSummary, "Tightness +2.0 · Risk appetite -4.0");
  });

  it("sorts action-strip levers by urgency instead of static domain order", () => {
    const html = renderToStaticMarkup(
      <ActionStripSection
        items={[
          {
            lever: "investment-pace",
            label: "Investment pace",
            actionNow: "Stage discretionary spend.",
            triggerThreshold: "Tighten if proof slips.",
            reversalCondition: "Reopen after proof recovers.",
            currentStateLabel: "Open",
            currentStateStep: 3,
            priorityDistancePoints: 9,
            priorityOrderIndex: 1,
          },
          {
            lever: "hiring-stance",
            label: "Hiring pace",
            actionNow: "Keep to backfills.",
            triggerThreshold: "Tighten if tightness worsens.",
            reversalCondition: "Reopen after recovery.",
            currentStateLabel: "Guarded",
            currentStateStep: 1,
            priorityDistancePoints: 1.5,
            priorityOrderIndex: 0,
          },
          {
            lever: "product-priorities",
            label: "Expansion bets",
            actionNow: "Keep only reversible pilots.",
            triggerThreshold: "Tighten if confidence slips.",
            reversalCondition: "Reopen after two improving reads.",
            currentStateLabel: "Staged",
            currentStateStep: 2,
            priorityDistancePoints: 3,
            priorityOrderIndex: 3,
          },
        ]}
      />,
    );

    assert.ok(html.indexOf("Hiring pace") < html.indexOf("Expansion bets"));
    assert.ok(html.indexOf("Expansion bets") < html.indexOf("Investment pace"));
    assert.match(html, /Rules by area/);
  });

  it("renders historical analog cards inside more context and continuity", () => {
    const model = buildWeeklyDecisionCardModel();
    const html = renderToStaticMarkup(
      <MoreContextDisclosureBody
        startupClimateIndex={model.diagnostics.startupClimateIndex}
        evidenceItems={model.diagnostics.evidenceItems}
        whyThisCall={model.diagnostics.whyThisCall}
        memoryRail={model.history.memoryRail}
        historicalTimeline={model.history.historicalTimeline}
        historicalAnalogs={model.history.historicalAnalogs}
        lastYearComparison={model.history.lastYearComparison}
        macroOverlay={model.history.macroOverlay}
      />,
    );

    assert.match(html, /Year-ago comparator/);
    assert.match(html, /Year-ago posture score comparison/);
    assert.match(html, /Closest historical analogs/);
    assert.match(html, /84% match/);
    assert.match(html, /Oct 3, 2025/);
  });

  it("renders decision-details disclosure for operating rules", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard model={buildWeeklyDecisionCardModel()} />,
    );

    assert.match(html, /Decision details/);
    assert.match(html, /Rules by area and what would change the call/);
  });
});
