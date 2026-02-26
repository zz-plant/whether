/**
 * Monthly summary sharing card for quick copy and API retrieval.
 * Keeps monthly action guidance shareable across the Regime Station UI.
 */

import type { MonthlySummary } from "../../lib/summary/monthlySummary";
import { SummaryCard } from "./summaryCard";

export const MonthlySummaryCard = ({ summary }: { summary: MonthlySummary }) => (
  <SummaryCard
    summaryCopy={summary.copy}
    cadenceLabel="monthly"
    apiHref="/api/monthly"
    structuredSections={[
      { title: "Execution constraints", items: summary.structured.executionConstraints },
      {
        title: "Provenance",
        items: [
          `Source: ${summary.structured.provenance.source}`,
          `Timestamp: ${summary.structured.provenance.timestamp}`,
          `Data age: ${summary.structured.provenance.dataAge}`,
        ],
      },
    ]}
  />
);
