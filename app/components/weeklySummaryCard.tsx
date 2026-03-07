/**
 * Weekly summary sharing card for quick copy and API retrieval.
 * Provides copy-ready text with direct access to the weekly summary endpoint.
 */

import type { WeeklySummary } from "../../lib/summary/weeklySummary";
import { CadenceSummaryCardAdapter } from "./cadenceSummaryCardAdapter";

export const WeeklySummaryCard = ({ summary }: { summary: WeeklySummary }) => (
  <CadenceSummaryCardAdapter cadence="weekly" summary={summary} />
);
