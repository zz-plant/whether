/**
 * Provides copy-ready text with direct access to the yearly summary endpoint.
 */
import type { YearlySummary } from "../../lib/yearlySummary";
import { SummaryCard } from "./summaryCard";

export const YearlySummaryCard = ({ summary }: { summary: YearlySummary }) => (
  <SummaryCard summaryCopy={summary.copy} cadenceLabel="yearly" apiHref="/api/yearly" />
);
