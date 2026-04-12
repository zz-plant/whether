import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MoreContextDisclosureBody, WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
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

  it("renders recent-movement sparklines for input influence cards", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard model={buildWeeklyDecisionCardModel()} />,
    );

    assert.match(html, /Capital tightness recent movement sparkline/);
    assert.match(html, /Risk appetite recent movement sparkline/);
    assert.match(html, /Recent path/);
  });
});
