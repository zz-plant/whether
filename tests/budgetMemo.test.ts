import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildBudgetMemoMarkdown } from "../app/operate/components/budgetMemo";
import { buildRunwayPlan, type RunwayPlannerRequest } from "../lib/report/runwayPlanner";
import type { MacroSeriesReading } from "../lib/types";
import { assessment, macros, sensors } from "./factories/exportFixtures";

/**
 * The runway planner's budget memo cites five readings for a board. It appended
 * "%" to every value, so the BBB spread, stored in basis points, read as
 * "174.00%", and a missing reading printed "N/A%".
 */

const macroReading = (overrides: Pick<MacroSeriesReading, "id" | "label" | "value" | "unit">): MacroSeriesReading => ({
  explanation: "",
  sourceLabel: "FRED",
  sourceUrl: "https://fred.stlouisfed.org",
  formulaUrl: "",
  record_date: "2026-02-01",
  fetched_at: "2026-03-04T00:00:00.000Z",
  isLive: true,
  ...overrides,
});

const macroSeries: MacroSeriesReading[] = [
  ...macros,
  macroReading({ id: "CPI_YOY", label: "CPI (YoY)", value: 2.9, unit: "%" }),
  macroReading({ id: "UNEMPLOYMENT_RATE", label: "Unemployment rate", value: 4.3, unit: "%" }),
];

const request: RunwayPlannerRequest = {
  runway: 14,
  burn: 450000,
  revenue: 300000,
  growthRate: 6,
  sector: "b2b-saas",
  stage: "series-a",
};

const output = buildRunwayPlan({
  ...request,
  regime: assessment.regime,
  posture: "RISK_ON",
  tightnessScore: assessment.scores.tightness,
  riskAppetiteScore: assessment.scores.riskAppetite,
});

const memoFor = (readings: { sensors: typeof sensors; macroSeries: MacroSeriesReading[] }) =>
  buildBudgetMemoMarkdown({
    assessment,
    ...readings,
    recordDateLabel: "Mar 4, 2026",
    output,
    request,
    growthAssumedFlat: false,
    paybackStrictness: { level: 1, label: "Cautious" },
    stageLabel: "Series A",
    sectorLabel: "B2B SaaS",
  });

describe("runway planner budget memo", () => {
  it("prints each reading in its own unit", () => {
    const memo = memoFor({ sensors, macroSeries });

    assert.match(memo, /\*\*Short-term borrowing rate\*\*: 3\.75% \(Source: US Treasury\)/);
    assert.match(memo, /\*\*Recession warning gauge \(10-year minus 2-year\)\*\*: 0\.55%/);
    assert.match(memo, /\*\*Corporate borrowing premium\*\*: 174\.00 basis points,/);
    assert.match(memo, /\*\*Inflation, year over year\*\*: 2\.90%/);
    assert.match(memo, /\*\*Unemployment rate\*\*: 4\.30%/);
    assert.doesNotMatch(memo, /N\/A|points%/);
  });

  it("says a reading is missing rather than printing a placeholder with a unit", () => {
    const memo = memoFor({ sensors: [], macroSeries: [] });

    assert.match(memo, /\*\*Short-term borrowing rate\*\*: not available this week/);
    assert.doesNotMatch(memo, /N\/A|—%|undefined|null/);
  });

  it("names the conditions in the public vocabulary, never the engine key", () => {
    const memo = memoFor({ sensors, macroSeries });

    assert.match(memo, /\*\*Conditions\*\*: Sunny · Pace:/);
    assert.doesNotMatch(memo, /EXPANSION|SCARCITY|DEFENSIVE|VOLATILE/);
  });
});
