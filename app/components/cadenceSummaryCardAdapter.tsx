import { CadenceSummaryCard } from "./cadenceSummaryCard";
import { SummaryCard } from "./summaryCard";
import { summaryCardCadences, type SummaryCadence, type SummaryPayloadByCadence } from "./summaryCardCadences";

type CadenceSummaryCardAdapterProps<TCadence extends SummaryCadence> = {
  cadence: TCadence;
  summary: SummaryPayloadByCadence[TCadence];
};

/**
 * Generic summary-card adapter that routes cadence payloads through
 * either the compact cadence wrapper or full structured summary card.
 */
export const CadenceSummaryCardAdapter = <TCadence extends SummaryCadence>({
  cadence,
  summary,
}: CadenceSummaryCardAdapterProps<TCadence>) => {
  const cadenceConfig = summaryCardCadences[cadence];

  if (!cadenceConfig.sectionBuilder && !cadenceConfig.companionHref) {
    return (
      <CadenceSummaryCard
        summaryCopy={summary.copy}
        cadenceLabel={cadenceConfig.cadenceLabel}
        apiHref={cadenceConfig.apiHref}
      />
    );
  }

  return (
    <SummaryCard
      summaryCopy={summary.copy}
      cadenceLabel={cadenceConfig.cadenceLabel}
      apiHref={cadenceConfig.apiHref}
      companionHref={cadenceConfig.companionHref}
      structuredSections={cadenceConfig.sectionBuilder?.(summary)}
    />
  );
};

