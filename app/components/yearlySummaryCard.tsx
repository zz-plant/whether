/**
 * Provides copy-ready text with direct access to the yearly summary endpoint.
 */
import type { YearlySummary } from "../../lib/summary/yearlySummary";
import { CadenceSummaryCardAdapter } from "./cadenceSummaryCardAdapter";

export const YearlySummaryCard = ({ summary }: { summary: YearlySummary }) => (
  <CadenceSummaryCardAdapter cadence="yearly" summary={summary} />
);
