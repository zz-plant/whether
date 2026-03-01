/**
 * Provides copy-ready text with direct access to the yearly summary endpoint.
 */
import type { YearlySummary } from "../../lib/summary/yearlySummary";
import { CadenceSummaryCard } from "./cadenceSummaryCard";

export const YearlySummaryCard = ({ summary }: { summary: YearlySummary }) => (
  <CadenceSummaryCard summaryCopy={summary.copy} cadenceLabel="yearly" apiHref="/api/yearly" />
);
