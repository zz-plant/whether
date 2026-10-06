import type { ReactElement } from "react";
import type { SignalsPageModel, SignalsPageSearchParams } from "../evidencePageModel";
import type { FocusTab } from "../evidenceQueryState";
import { SignalsCallLinesSection, SignalsCallSection, SignalsWhatChangedSection } from "./evidenceReaderSections";
import { SignalsInstrumentsSection } from "./evidenceInstruments";

/**
 * The evidence page's four sections, in the order a reader answers their
 * questions: what the call is, what changed, what would change it, and the
 * instruments to check the method with.
 *
 * Returned as an array, and called rather than rendered. `ReportShell` wraps
 * each child in a divided, padded row, and `Children.toArray` flattens arrays
 * but not a component's output. This used to be a component returning a
 * fragment, on the belief that the fragment's children arrived as siblings;
 * they did not, so all four sections shared one row and ran into each other
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
  <SignalsCallSection
    key="decision-summary"
    callLine={model.actionNowShort ?? "Keep this week's guidance while the scores stay inside their lines."}
  />,
  <SignalsWhatChangedSection
    key="what-changed"
    rows={model.changedSignalRows}
    activeFocus={model.activeFocus}
    focusLabelByTab={focusLabelByTab}
    focusInstruments={model.focusInstruments}
    searchParams={searchParams}
    basis={model.basis}
  />,
  <SignalsCallLinesSection
    key="call-lines"
    ladders={model.callLineLadders}
    triggerCondition={model.triggerCondition}
    reversalCondition={model.reversalCondition}
    showMicroDecisionRows={model.showMicroDecisionRows}
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
