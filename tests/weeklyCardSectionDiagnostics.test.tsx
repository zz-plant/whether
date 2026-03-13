import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DiagnosticsSection } from "../app/components/weekly-card/DiagnosticsSection";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

describe("DiagnosticsSection", () => {
  it("renders diagnostics accordion content with decision delta and evidence", () => {
    const model = buildWeeklyDecisionCardModel();
    const html = renderToStaticMarkup(
      <DiagnosticsSection
        weeklyMemoLines={model.decision.weeklyMemoLines}
        immediateDecision={model.decision.immediateDecision}
        revisitDecisions={model.decision.revisitDecisions}
        guardrail={model.decision.guardrail}
        regimeDistance={model.diagnostics.regimeDistance}
        postureWithStageLabel={model.status.postureWithStageLabel}
        statusLabel={model.status.statusLabel}
        trendLabel={model.status.trendLabel}
        confidencePercent={model.status.confidencePercent}
        decisionMatrix={model.decision.decisionMatrix}
        decisionRules={model.decision.decisionRules}
        roleAwareTemplates={model.decision.roleAwareTemplates}
        evidenceItems={model.diagnostics.evidenceItems}
        reportDynamics={model.decision.reportDynamics}
        weeklyMovement={model.decision.weeklyMovement}
        transitionProbabilities={model.decision.transitionProbabilities}
        failureModes={model.diagnostics.failureModes ?? []}
        historicalTimeline={model.history.historicalTimeline}
        renderBoundedRulesMatrix={() => <div>matrix</div>}
      />,
    );

    assert.match(html, /Need deeper analysis\?/);
    assert.match(html, /Since last review/);
    assert.match(html, /Open diagnostics: evidence, drivers, and model inputs/);
    assert.match(html, /Defensive probability:/);
  });
});
