/**
 * Monthly summary sharing card for quick copy and API retrieval.
 * Keeps monthly action guidance shareable across the Regime Station UI.
 */

import type { MonthlySummary } from "../../lib/summary/monthlySummary";
import { CadenceSummaryCardAdapter } from "./cadenceSummaryCardAdapter";

export const MonthlySummaryCard = ({ summary }: { summary: MonthlySummary }) => (
  <CadenceSummaryCardAdapter cadence="monthly" summary={summary} />
);
