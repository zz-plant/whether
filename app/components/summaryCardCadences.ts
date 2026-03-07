import type { MonthlySummary } from "../../lib/summary/monthlySummary";
import type { QuarterlySummary } from "../../lib/summary/quarterlySummary";
import type { WeeklySummary } from "../../lib/summary/weeklySummary";
import type { YearlySummary } from "../../lib/summary/yearlySummary";

export type SummaryCadence = "weekly" | "monthly" | "quarterly" | "yearly";

export type SummarySection = {
  title: string;
  items: string[];
};

export type SummaryPayloadByCadence = {
  weekly: WeeklySummary;
  monthly: MonthlySummary;
  quarterly: QuarterlySummary;
  yearly: YearlySummary;
};

type CadenceSummaryConfigByKey = {
  [K in SummaryCadence]: {
    cadenceLabel: K;
    apiHref: string;
    companionHref?: string;
    sectionBuilder?: (summary: SummaryPayloadByCadence[K]) => SummarySection[];
  };
};

/**
 * Canonical summary-card wiring for each cadence surface.
 * Keeps API links + structured sections aligned across adapters.
 */
export const summaryCardCadences: CadenceSummaryConfigByKey = {
  weekly: {
    cadenceLabel: "weekly",
    apiHref: "/api/weekly",
    companionHref: "/operations/data#weekly-api",
    sectionBuilder: (summary) => [
      { title: "Capital posture", items: [summary.structured.climate.label, ...summary.structured.climate.summary] },
      { title: "Recommended moves", items: summary.structured.recommendedMoves },
      { title: "Execution priorities", items: summary.structured.executionPriorities },
      { title: "Watchouts", items: summary.structured.watchouts },
      { title: "Execution constraints", items: summary.structured.executionConstraints },
    ],
  },
  monthly: {
    cadenceLabel: "monthly",
    apiHref: "/api/monthly",
    sectionBuilder: (summary) => [
      { title: "Execution constraints", items: summary.structured.executionConstraints },
      {
        title: "Provenance",
        items: [
          `Source: ${summary.structured.provenance.source}`,
          `Timestamp: ${summary.structured.provenance.timestamp}`,
          `Data age: ${summary.structured.provenance.dataAge}`,
        ],
      },
    ],
  },
  quarterly: {
    cadenceLabel: "quarterly",
    apiHref: "/api/quarterly",
  },
  yearly: {
    cadenceLabel: "yearly",
    apiHref: "/api/yearly",
  },
};

