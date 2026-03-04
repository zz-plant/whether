/**
 * Weekly summary sharing card for quick copy and API retrieval.
 * Provides copy-ready text with direct access to the weekly summary endpoint.
 */

import type { WeeklySummary } from "../../lib/summary/weeklySummary";
import { SummaryCard } from "./summaryCard";

export const WeeklySummaryCard = ({ summary }: { summary: WeeklySummary }) => (
  <SummaryCard
    summaryCopy={summary.copy}
    cadenceLabel="weekly"
    apiHref="/api/weekly"
    companionHref="/operations/data#weekly-api"
    structuredSections={[
      { title: "Capital posture", items: [summary.structured.climate.label, ...summary.structured.climate.summary] },
      { title: "Recommended moves", items: summary.structured.recommendedMoves },
      { title: "Execution priorities", items: summary.structured.executionPriorities },
      { title: "Watchouts", items: summary.structured.watchouts },
      { title: "Execution constraints", items: summary.structured.executionConstraints },
    ]}
  />
);
