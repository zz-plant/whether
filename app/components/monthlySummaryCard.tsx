/**
 * Monthly summary sharing card for quick copy and API retrieval.
 * Keeps monthly action guidance shareable across the Regime Station UI.
 */

import type { MonthlySummary } from "../../lib/monthlySummary";
import { SummaryCard } from "./summaryCard";

export const MonthlySummaryCard = ({ summary }: { summary: MonthlySummary }) => (
  <SummaryCard summaryCopy={summary.copy} cadenceLabel="monthly" apiHref="/api/monthly" />
);
