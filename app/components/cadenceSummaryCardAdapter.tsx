import { SummaryCard } from "./summaryCard";
import { summaryCardCadences, type SummaryCadence, type SummaryPayloadByCadence } from "./summaryCardCadences";

type CadenceSummaryCardAdapterProps<TCadence extends SummaryCadence> = {
  cadence: TCadence;
  summary: SummaryPayloadByCadence[TCadence];
};

/**
 * Renders a cadence's summary payload through the one summary card.
 *
 * This used to branch: a cadence with no `sectionBuilder` and no
 * `companionHref` went to a `CadenceSummaryCard` wrapper, everything else went
 * to `SummaryCard`. The two arms were the same render — the wrapper forwarded
 * three props to `SummaryCard` and added nothing, and the props the other arm
 * passed extra (`companionHref`, `sectionBuilder?.(summary)`) are already
 * `undefined` in exactly the case the first arm handled. One call, one card.
 */
export const CadenceSummaryCardAdapter = <TCadence extends SummaryCadence>({
  cadence,
  summary,
}: CadenceSummaryCardAdapterProps<TCadence>) => {
  const cadenceConfig = summaryCardCadences[cadence];

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
