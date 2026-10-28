import type { ReactElement } from "react";
import type { SignalsPageModel, SignalsPageSearchParams } from "../evidencePageModel";
import type { FocusTab } from "../evidenceQueryState";
import { SignalsWhatChangedSection } from "./evidenceReaderSections";
import { SignalsInstrumentsSection } from "./evidenceInstruments";

/**
 * The evidence page's three sections, in the order a reader answers their
 * questions: what changed, what would change the guidance, and the
 * instruments to check the method with. It opened on "What this means now",
 * the brief's call restated under the shell's own stamp; the page leads with
 * the delta now (Hard rule 1), and the call stays on the brief.
 *
 * Returned as an array, and called rather than rendered. `ReportShell` wraps
 * each child in a divided, padded row, and `Children.toArray` flattens arrays
 * but not a component's output. This used to be a component returning a
 * fragment, on the belief that the fragment's children arrived as siblings;
 * they did not, so every section shared one row and ran into each other
 * with no rule or gap between them.
 */
export const signalsEvidenceSections = ({
  model,
  focusLabelByTab,
  tightnessTrend,
  riskAppetiteTrend,
  searchParams,
}: {
  model: SignalsPageModel;
  focusLabelByTab: Record<FocusTab, string>;
  tightnessTrend: Array<{ label: string; value: number }>;
  riskAppetiteTrend: Array<{ label: string; value: number }>;
  searchParams?: SignalsPageSearchParams;
}): ReactElement[] => [
  <SignalsWhatChangedSection
    key="what-changed"
    rows={model.changedSignalRows}
    activeFocus={model.activeFocus}
    focusLabelByTab={focusLabelByTab}
    focusInstruments={model.focusInstruments}
    searchParams={searchParams}
    basis={model.basis}
  />,
  <SignalsInstrumentsSection
    key="instruments"
    assessment={model.assessment}
    treasury={model.treasury}
    yieldCurveSeries={model.yieldCurveSeries}
    tightnessTrend={tightnessTrend}
    riskAppetiteTrend={riskAppetiteTrend}
    regimeSeries={model.regimeSeries}
    selectedYear={model.selectedYear}
    selectedMonth={model.selectedMonth}
    isHistorical={Boolean(model.historicalSelection)}
    cacheCoverage={model.cacheCoverage}
    cacheMonthsByYear={model.cacheMonthsByYear}
    invalidHistoricalSelection={model.invalidHistoricalSelection}
    monthPickerOpen={model.monthPickerOpen}
    searchParams={searchParams}
  />,
];
