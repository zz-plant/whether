/**
 * Weekly summary sharing card for quick copy and API retrieval.
 * Provides copy-ready text with direct access to the weekly summary endpoint.
 */

import type { WeeklySummary } from "../../lib/summary/weeklySummary";
import { SummaryCard } from "./summaryCard";

export const WeeklySummaryCard = ({ summary }: { summary: WeeklySummary }) => (
  <SummaryCard summaryCopy={summary.copy} cadenceLabel="weekly" apiHref="/api/weekly" />
);
