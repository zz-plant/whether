/**
 * Provides copy-ready text with direct access to the quarterly summary endpoint.
 */
import type { QuarterlySummary } from "../../lib/summary/quarterlySummary";
import { SummaryCard } from "./summaryCard";

export const QuarterlySummaryCard = ({ summary }: { summary: QuarterlySummary }) => (
  <SummaryCard summaryCopy={summary.copy} cadenceLabel="quarterly" apiHref="/api/quarterly" />
);
