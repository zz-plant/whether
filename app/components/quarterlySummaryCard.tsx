/**
 * Provides copy-ready text with direct access to the quarterly summary endpoint.
 */
import type { QuarterlySummary } from "../../lib/summary/quarterlySummary";
import { CadenceSummaryCardAdapter } from "./cadenceSummaryCardAdapter";

export const QuarterlySummaryCard = ({ summary }: { summary: QuarterlySummary }) => (
  <CadenceSummaryCardAdapter cadence="quarterly" summary={summary} />
);
