/**
 * Provides copy-ready text with direct access to the quarterly summary endpoint.
 */
import type { QuarterlySummary } from "../../lib/summary/quarterlySummary";
import { CadenceSummaryCard } from "./cadenceSummaryCard";

export const QuarterlySummaryCard = ({ summary }: { summary: QuarterlySummary }) => (
  <CadenceSummaryCard summaryCopy={summary.copy} cadenceLabel="quarterly" apiHref="/api/quarterly" />
);
