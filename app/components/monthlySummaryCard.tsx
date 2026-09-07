/**
 * Monthly summary sharing card for quick copy and API retrieval.
 *
 * This used to reach `SummaryCard` through a generic cadence layer — a
 * `CadenceSummaryCardAdapter` keyed by a `summaryCardCadences` config carrying
 * weekly, monthly, quarterly and yearly entries. Only `monthly` was ever
 * rendered: `monthlyActionSummaryPanel` is the single caller, and the other
 * three cadences were exercised only by the adapter's own test. The API routes
 * for those cadences serve their data without rendering this card, so the
 * generic layer was scaffolding for surfaces that do not exist. The monthly
 * sections it held live here now, next to the one card that shows them.
 */
import type { MonthlySummary } from "../../lib/summary/monthlySummary";
import { SummaryCard } from "./summaryCard";

const MONTHLY_API_HREF = "/api/monthly";

/** Section order is load-bearing: posture first, then what to do, then what would reverse it. */
const buildMonthlySections = (summary: MonthlySummary) => [
  {
    title: "Monthly posture",
    items: [summary.structured.posture.label, ...summary.structured.posture.summary],
  },
  { title: "Planning language", items: [summary.structured.planningLanguage] },
  { title: "Bounded next actions", items: summary.structured.boundedNextActions },
  { title: "Top reversals", items: summary.structured.reversalConditions },
  { title: "Execution constraints", items: summary.structured.executionConstraints },
  {
    title: "Provenance",
    items: [
      `Source: ${summary.structured.provenance.source}`,
      `Timestamp: ${summary.structured.provenance.timestamp}`,
      `Data age: ${summary.structured.provenance.dataAge}`,
    ],
  },
];

export const MonthlySummaryCard = ({ summary }: { summary: MonthlySummary }) => (
  <SummaryCard
    summaryCopy={summary.copy}
    cadenceLabel="monthly"
    apiHref={MONTHLY_API_HREF}
    structuredSections={buildMonthlySections(summary)}
  />
);
