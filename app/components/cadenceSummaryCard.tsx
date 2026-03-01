import { SummaryCard } from "./summaryCard";

type CadenceSummaryCardProps = {
  cadenceLabel: string;
  apiHref: string;
  summaryCopy: string;
};

/**
 * Shared summary card renderer for cadences that only expose copy + API link.
 */
export const CadenceSummaryCard = ({ cadenceLabel, apiHref, summaryCopy }: CadenceSummaryCardProps) => (
  <SummaryCard summaryCopy={summaryCopy} cadenceLabel={cadenceLabel} apiHref={apiHref} />
);
